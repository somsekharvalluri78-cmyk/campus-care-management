FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci

COPY backend ./backend
COPY frontend ./frontend
COPY database ./database
RUN npm run build

ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm", "start"]