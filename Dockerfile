FROM node:20-alpine
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn install --production
COPY ./ ./
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "src/app.js"]