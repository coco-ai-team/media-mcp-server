FROM node:20

WORKDIR /app

RUN apt update \
  && apt install -y ffmpeg \
  && apt autoremove -y \
  && apt clean \
  && rm -rf /var/lib/apt/lists/*

COPY ./ ./

RUN npm i && npm run build

ENTRYPOINT ["node", "dist/index.js"]
