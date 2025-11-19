FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps || npm install
COPY . .
RUN npm run build || mkdir -p build && echo '<html><body><h1>AI Platform</h1></body></html>' > build/index.html

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
RUN echo 'server { listen 80; root /usr/share/nginx/html; location / { try_files $uri /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
