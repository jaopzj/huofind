FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

# Install Playwright Chromium and all its system dependencies
RUN npx playwright install --with-deps chromium

COPY . .

CMD ["node", "server.js"]
