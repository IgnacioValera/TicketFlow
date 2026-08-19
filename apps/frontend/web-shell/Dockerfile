FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Prefer API_ORIGIN (e.g. https://ticketflow-api.onrender.com) and append /api/v1.
# Fall back to VITE_API_BASE_URL for local Docker Compose builds.
ARG API_ORIGIN=
ARG VITE_API_BASE_URL=http://localhost:8000/api/v1
ARG VITE_USE_MOCKS=false
ENV VITE_USE_MOCKS=$VITE_USE_MOCKS
RUN if [ -n "$API_ORIGIN" ]; then \
      export VITE_API_BASE_URL="${API_ORIGIN%/}/api/v1"; \
    else \
      export VITE_API_BASE_URL="$VITE_API_BASE_URL"; \
    fi && \
    echo "Building with VITE_API_BASE_URL=$VITE_API_BASE_URL" && \
    npm run build

FROM nginx:1.29-alpine
ENV PORT=80
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
