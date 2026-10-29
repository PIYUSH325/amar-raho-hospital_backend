FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY . .

EXPOSE 5001

CMD ["sh", "-c", "npx prisma db push && npm start"]
