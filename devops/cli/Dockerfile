# Container image that runs your code
# Execute from the root of the repository:
# docker build -t docker-cli -f ./devops/cli/Dockerfile . --progress=plain
# docker run --rm -it docker-cli sh
# docker run --rm -it --env-file <(infisical export --format=dotenv --path='/GITHUB_SAAS' --env=dev | while IFS= read -r line; do eval "echo  $line"; done) docker-cli rclone copy -P -M --no-check-dest --header "Cache-Control: public,max-age=31536004,immutable" '/cli/package.json' 'r2:/build-artifacts'
FROM node:18.20-alpine3.18 as build

ENV CI=true
ENV SKIP_INSTALL_SIMPLE_GIT_HOOKS=true
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

COPY ./ /webstudio
WORKDIR /webstudio

ENV PNPM_HOME="/.pnpm/store"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm && mkdir -p $PNPM_HOME
RUN pnpm install --ignore-scripts
RUN pnpm --filter 'webstudio-cloudlfare-template^...' run build
RUN pnpm --filter 'webstudio-cloudlfare-template' deploy /cloudlfare-template

WORKDIR /cloudlfare-template

RUN \
  find . -name 'typescript@*' -type d -prune -exec rm -rf '{}' + && \
  # find . -name 'workerd*' -type f -prune -exec rm -rf '{}' + && \
  find . -name '@storybook*' -type d -prune -exec rm -rf '{}' + && \
  find . -name 'eslint@*' -type d -prune -exec rm -rf '{}' + && \
  find . -name '@types+node@*' -type d -prune -exec rm -rf '{}' + && \
  find . -name '@cloudflare+workers-types@*' -type d -prune -exec rm -rf '{}' +
  # find . -name 'wrangler@*' -type d -prune -exec rm -rf '{}' +

ENV COMPATIBILITY_DATE=2024-04-10

RUN \
  pnpm webstudio build --template internal --template saas-helpers --template cloudflare --assets false && \
  pnpm build && \
  NODE_ENV=production pnpm wrangler deploy \
  --name build \
  --compatibility-date '${COMPATIBILITY_DATE}' \
  --minify true \
  --logpush true \
  --dry-run \
  --outdir dist \
  './functions/[[path]].ts'

RUN rm -rf dist && rm -rf build && rm -rf .wrangler

FROM node:18.20-alpine3.18 as cloudflare-template

ENV PNPM_HOME="/.pnpm/store"
ENV PATH="$PNPM_HOME:$PATH"
ENV COMPATIBILITY_DATE=2024-04-10
ENV CI=true

RUN \
  corepack enable pnpm && mkdir -p $PNPM_HOME && \
  apk update && apk add bash curl rclone postgresql14-client --no-cache && \
  pnpm i -g --prod zx

# && pnpm i -g --prod wrangler
# && find / -name 'workerd*' -type f -prune -exec rm -rf '{}' +

COPY --from=build /cloudlfare-template /cloudlfare-template

WORKDIR /cloudlfare-template

# RUN \
#   pnpm webstudio build --template internal --template saas-helpers --template cloudflare --assets false && \
#   pnpm build && \
#   NODE_ENV=production wrangler deploy \
#   --name build \
#   --compatibility-date ${COMPATIBILITY_DATE} \
#   --minify true \
#   --logpush true \
#   --dry-run \
#   --outdir dist \
#   './functions/[[path]].ts'
#
# # Clean up
# RUN rm -rf dist && rm -rf build && rm -rf .wrangler

# TODO: Layered build, production deps only
