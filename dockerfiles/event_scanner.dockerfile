FROM node:19-alpine3.15 as builder

WORKDIR /app
COPY event_scanner .

RUN npm install -g pnpm
RUN pnpm install
RUN pnpm build


FROM node:19-alpine3.15

COPY --from=builder /app/dist /app/dist
CMD ["node", "/app/dist/index.js"]