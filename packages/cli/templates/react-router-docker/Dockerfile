FROM node:22-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm install

FROM node:22-alpine AS production-dependencies-env
COPY .npmrc ./package.json /app/
WORKDIR /app
RUN npm install --omit=dev

FROM node:22-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npm run build

FROM node:22-alpine
COPY .npmrc ./package.json /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
COPY --from=build-env /app/public /app/public
WORKDIR /app
# there is a DOMAINS env with comma separated allowed domains for image processing
CMD ["npm", "run", "start"]
