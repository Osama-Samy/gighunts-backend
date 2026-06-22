FROM node:20-alpine

WORKDIR /app

# Install native dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

COPY start.sh .

RUN chmod +x start.sh

# Use entrypoint to handle arguments correctly
ENTRYPOINT ["sh", "/app/start.sh"]

# Default command
CMD ["npm", "start"]
