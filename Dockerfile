FROM node:latest AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

FROM nginx:latest
RUN mkdir /html
COPY --from=builder /app/dist /html
WORKDIR /html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
