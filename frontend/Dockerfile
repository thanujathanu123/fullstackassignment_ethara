# Build stage
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
ENV PORT=8080
EXPOSE 8080
# Copy custom nginx config template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html
CMD ["nginx", "-g", "daemon off;"]
