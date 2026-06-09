FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy application source code
COPY . .

# Ensure uploads directory exists and is writable
RUN mkdir -p uploads && chmod 777 uploads

# Hugging Face Spaces exposes port 7860 by default
EXPOSE 7860

# Start both the background worker and the API server in parallel
CMD node src/workers/analyticsWorkerRunner.js & node src/server.js
