FROM node:20-bookworm-slim

# better-sqlite3 may need to compile its native module during installation.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p /app/database && chown -R node:node /app
USER node
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
