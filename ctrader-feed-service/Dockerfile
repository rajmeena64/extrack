FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV FEED_HOST=0.0.0.0
ENV FEED_PORT=8020
ENV NODE_ENV=production
ENV FEED_REQUIRE_HTTPS=true

EXPOSE 8020

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const p=process.env.FEED_PORT||process.env.PORT||8020;fetch('http://127.0.0.1:'+p+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
