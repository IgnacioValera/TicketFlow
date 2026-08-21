FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG API_ORIGIN=
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
ARG NEXT_PUBLIC_USE_MOCKS=false
ENV NEXT_PUBLIC_USE_MOCKS=$NEXT_PUBLIC_USE_MOCKS
# Render blueprint passes API_ORIGIN; local compose can pass NEXT_PUBLIC_API_BASE_URL directly.
RUN if [ -n "$API_ORIGIN" ]; then \
      export NEXT_PUBLIC_API_BASE_URL="${API_ORIGIN}/api/v1"; \
    else \
      export NEXT_PUBLIC_API_BASE_URL="$NEXT_PUBLIC_API_BASE_URL"; \
    fi \
  && echo "Building with NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL" \
  && NEXT_PUBLIC_API_BASE_URL="$NEXT_PUBLIC_API_BASE_URL" NEXT_PUBLIC_USE_MOCKS="$NEXT_PUBLIC_USE_MOCKS" npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
