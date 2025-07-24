FROM node:20

WORKDIR /app
RUN mkdir /uploads
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "app.js"]
