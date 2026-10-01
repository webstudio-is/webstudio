FROM node:22-alpine AS dependencies-env
COPY .npmrc package.json /app/
WORKDIR /app
RUN npm install --omit=dev

FROM dependencies-env AS build-env
COPY . /app/
WORKDIR /app
RUN npm install
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
COPY .npmrc package.json /app/
COPY --from=dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
COPY --from=build-env /app/public /app/public
COPY --from=build-env /app/server.mjs /app/server.mjs
WORKDIR /app
# DOMAINS: comma-separated allowed domains for image processing.
# TRUST_PROXY: comma-separated trusted proxy IP addresses or CIDR ranges.
CMD ["npm", "run", "start"]
