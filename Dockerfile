FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY vite.config.ts tsconfig.json components.json bunfig.toml ./
COPY public ./public
COPY src ./src

ENV VITE_API_URL=http://localhost:3001

EXPOSE 8080

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]
