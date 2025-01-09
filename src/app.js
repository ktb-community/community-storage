const express = require('express');
const app = express();
const {S3Client, GetObjectCommand} = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
require('dotenv').config({path: './.env'})

app.use(express.json());
app.use(express.urlencoded({extended: true}));

/* Metrics */
const client = require("prom-client");
const apiMetrics = require("prometheus-api-metrics");
const register = new client.Registry();

app.use(apiMetrics());

app.get("/metrics", async (req, res) => {
    res.setHeader("Content-Type", register.contentType);
    res.end(await register.metrics());
});

/* S3 Bucket 연동 */
const ACCESS_KEY_ID = process.env.ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.BUCKET_NAME;
const REGION = process.env.REGION;
const PORT = parseInt(process.env.PORT) || 8080;

const s3Client = new S3Client({
    region: REGION, credentials: {
        accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY
    }
});

const storage = multerS3({
    s3: s3Client, bucket: BUCKET_NAME, contentType: multerS3.AUTO_CONTENT_TYPE, acl: 'public-read', // 버킷에서 acl 관련 설정을 풀어줘야 사용할 수 있다.
    metadata: function (req, file, cb) {
        cb(null, {fieldName: file.fieldname});
    }, key: function (req, file, cb) {
        cb(null, `contents/${Date.now()}_${file.originalname}`);
    }
});

const upload = multer({
    storage: storage
});

app.get('/storage/:key', async (req, res) => {
    const objectKey = req.params.key;
    const bucketName = BUCKET_NAME;
    const keyName = `contents/${objectKey}`;

    const response = await s3Client.send(new GetObjectCommand({
        Bucket: bucketName, Key: keyName,
    }),);

    res.setHeader('Cache-Control', `public, max-age=${3600 * 24}`);
    return response.Body.pipe(res);
});

app.post('/storage', upload.single('photo'), async (req, res) => {
    const photo = req.file;
    const loc = photo.location;
    const key = loc.substring(loc.lastIndexOf('/') + 1);
    res.json({key});
});

app.listen(PORT || 8080, () => {
    console.log(`App listening on ${PORT}`);
});
