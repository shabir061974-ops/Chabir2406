# ---- Frontend (React build served by Nginx) ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
# REACT_APP_BACKEND_URL is baked in at build time (CRA). Pass via --build-arg.
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
RUN yarn build

FROM nginx:1.27-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN chmod -R 755 /usr/share/nginx/html && find /usr/share/nginx/html -type f -exec chmod 644 {} \;
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
