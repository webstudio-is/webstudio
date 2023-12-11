FROM node:18 AS base

ENV PNPM_HOME="/pnpm"
ENV PNPM_VERSION="8.8.0"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_VERSION="18"

ENV DB_PROTOCOL="postgresql"
ENV DB_USER="user"
ENV DB_PASS="password"
ENV DB_HOST="postgres"
ENV DB_DB="webstudio"

#REQUIRED
ENV DATABASE_URL="$DB_PROTOCOL://$DB_USER:$DB_PASS@$DB_HOST/$DB_DB"
ENV AUTH_SECRET="pass"

RUN corepack enable

# RUN apt-get update -y && apt-get install -y openssl
RUN curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION=$PNPM_VERSION SHELL="$(which bash)" bash -

WORKDIR /app

COPY package.json ./
COPY pnpm* ./
COPY apps/builder/package.json ./apps/builder/package.json
COPY patches/ ./patches

#TODO optimise build further
COPY . ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

RUN npx prisma generate
RUN pnpm run build

# RUN pnpm migrations migrate

EXPOSE 3000

CMD pnpm -C ./apps/builder start
# CMD pnpm dev