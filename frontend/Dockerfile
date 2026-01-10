FROM node:22.18.0-alpine

# # Upgrade npm to match local environment
# RUN npm install -g npm@11.5.2

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Note: Source code is mounted via docker-compose volume for hot-reload

EXPOSE 5173