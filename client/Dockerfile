FROM node:22-alpine AS deps
WORKDIR /client
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /client
COPY --from=deps /client/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /client/public ./public
COPY --from=builder /client/.next/standalone ./
COPY --from=builder /client/.next/static ./.next/static

USER node

EXPOSE 3000

CMD ["node", "server.js"]
