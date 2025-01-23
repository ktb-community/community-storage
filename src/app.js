require("./config/init");

const express = require('express');
const {S3Client, GetObjectCommand} = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const cors = require('cors');
const withTransaction = require("./middlewares/transaction");
const { checkArguments } = require("./utils/utils");

const ACCESS_KEY_ID = process.env.ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.BUCKET_NAME;
const REGION = process.env.REGION;
const PORT = parseInt(process.env.PORT) || 8080;

const app = express();

if (process.env.NODE_ENV === 'development') {
    app.use(cors());
}

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
const s3Client = new S3Client({
    region: REGION, credentials: {
        accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY
    }
});

const storage = multerS3({
    s3: s3Client,
    bucket: BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    acl: 'public-read', // 버킷에서 acl 관련 설정을 풀어줘야 사용할 수 있다.
    key: function (req, file, cb) {
        const filename = `${Date.now()}_${file.originalname}`;
        cb(null, `contents/${filename}`);
    }
});

const upload = multer({
    storage: storage
});

app.get('/storage/:key', async (req, res) => {
    const { key } = req.params;
    const keyName = `contents/${key}`;

    try {
        const response = await s3Client.send(
            new GetObjectCommand({ Bucket: BUCKET_NAME, Key: keyName })
        );

        // Cache-Control 헤더 설정
        res.setHeader('Cache-Control', `public, max-age=${3600 * 24}`);

        // S3 객체의 내용을 스트림으로 클라이언트에 전달
        return response.Body.pipe(res);
    } catch (error) {
        if (error.name === "NoSuchKey") {
            // 키가 존재하지 않을 경우
            return res.status(404).json({ message: "The requested resource was not found." });
        }

        // 다른 에러 처리
        console.error("Error fetching object from S3:", error);
        return res.status(500).json({ message: "An error occurred while fetching the resource." });
    }
});

app.post('/storage', upload.single('file'), async (req, res) => {
    return await withTransaction(async conn => {
        const { location, key: objectKey, size, mimetype } = req.file;
        const { nickname, email } = req.body;

        if (!checkArguments(location, objectKey, size, mimetype, nickname, email)) {
            return res.status(400).end();
        }

        const filename = objectKey.substring(objectKey.lastIndexOf('/') + 1);
        const key = location.substring(location.lastIndexOf('/') + 1);

        // 저장된 S3 Object 기록
        const query = `
            INSERT INTO FILES (ownerEmail, ownerNickname, fileName, fileKey, fileSize, fileType)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        conn.execute(query, [email, nickname, filename, key, size, mimetype]);

        return res.json({ key });
    })
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.message });
    }

    if (err.message) {
        return res.status(400).json({ message: err.message });
    }

    console.error(err);
    res.status(500).json({ message: "An unexpected error occurred." });
});

app.listen(PORT || 8080, () => {
    console.log(`App listening on ${PORT}`);
});
