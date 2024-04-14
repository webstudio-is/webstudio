# Container image that runs your code
# Execute from the root of the repository:
# docker build -t docker-cli -f ./devops/cli/Dockerfile . --progress=plain
# docker run --rm -it docker-cli sh
# docker run --rm -it --env-file <(infisical export --format=dotenv --path='/GITHUB_SAAS' --env=dev | while IFS= read -r line; do eval "echo  $line"; done) docker-cli rclone copy -P -M --no-check-dest --header "Cache-Control: public,max-age=31536004,immutable" '/cli/package.json' 'r2:/build-artifacts'
FROM node:18-buster-slim

ENV CI=true
ENV SKIP_INSTALL_SIMPLE_GIT_HOOKS=true
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

RUN apt-get update \
&& apt-get install -yq curl gnupg lsb-release \
&& curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc|gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg \
&& echo "deb http://apt.postgresql.org/pub/repos/apt/ `lsb_release -cs`-pgdg main" |tee  /etc/apt/sources.list.d/pgdg.list \
&& apt-get update \
&& DEBIAN_FRONTEND=noninteractive apt-get install -yq curl unzip postgresql-client-14

RUN curl https://rclone.org/install.sh | bash

COPY ./ /cli
WORKDIR /cli

ENV PNPM_HOME="/.pnpm/store"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable pnpm && mkdir -p $PNPM_HOME
RUN pnpm i -g zx
RUN pnpm i -g bun


# Install deps, build cli
RUN pnpm install --ignore-scripts
RUN pnpm -r --filter './packages/*' run build

# Test build is working

ENV COMPATIBILITY_DATE=2024-04-10
WORKDIR /cli/fixtures/webstudio-cloudlfare-template

RUN \
  pnpm fixtures:build && \
  pnpm build && \
  NODE_ENV=production pnpm wrangler deploy \
  --name build \
  --compatibility-date ${COMPATIBILITY_DATE} \
  --minify true \
  --logpush true \
  --dry-run \
  --outdir dist \
  './functions/[[path]].ts'

# Clean up
RUN rm -rf dist && rm -rf build && rm -rf .wrangler

# TODO: Layered build, production deps only