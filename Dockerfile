# Stage 1: Build TypeScript
FROM node:21 as builder

WORKDIR /opt/lavamusic/

# Copy package files and install dependencies
COPY package*.json ./
RUN apt-get update && \
    apt-get install -y && \
    npm install
# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Create production image
FROM node:21-slim

ENV NODE_ENV production

WORKDIR /opt/lavamusic/

# Install Git
RUN apt-get update && \
    apt-get install -y git

# Copy compiled code
COPY --from=builder /opt/lavamusic/dist ./dist
COPY --from=builder /opt/lavamusic/src/utils/LavaLogo.txt ./src/utils/LavaLogo.txt
COPY --from=builder /opt/lavamusic/database/lavamusic.db ./database/lavamusic.db

# Copy package files and install dependencies
COPY package*.json ./
RUN apt-get update && \
    apt-get install -y && \
    npm install --only=production


CMD [ "node", "dist/index.js" ]
