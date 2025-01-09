FROM node:20-alpine
WORKDIR /usr/src/app
RUN apk add --no-cache tzdata && ln -snf /usr/share/zoneinfo/Asia/Seoul /etc/localtime
COPY package.json yarn.lock ./
RUN yarn install --production
COPY ./ ./
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "src/app.js"]