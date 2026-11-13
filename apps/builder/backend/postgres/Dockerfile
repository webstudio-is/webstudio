FROM postgres:15.19-bookworm

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends --yes postgresql-15-pgtap \
  && rm -rf /var/lib/apt/lists/*
