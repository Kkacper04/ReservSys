FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Build Next.js application
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
