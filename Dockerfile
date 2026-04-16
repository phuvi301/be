FROM node:20-bookworm-slim

WORKDIR /app

# Install system dependencies for Python-based recognition and audio processing.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]