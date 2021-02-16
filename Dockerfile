FROM node:14

WORKDIR /usr/src/app

COPY package.json ./
COPY yarn.lock ./

RUN yarn install

COPY src src

EXPOSE 80

CMD [ "node", "src/app.js" ]
