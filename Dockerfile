ARG ARCH=amd64

FROM jimone5499/node-ffmpeg:${ARCH}

WORKDIR /app

COPY . .

RUN npm ci && \
    npm run build && \
    npm cache clean --force

ENTRYPOINT ["node", "dist/index.js"]
