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
COPY .npmrc package.json /app/
COPY --from=dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
COPY --from=build-env /app/public /app/public
WORKDIR /app
# there is a DOMAINS env with comma separated allowed domains for image processing
CMD ["npm", "run", "start"]
