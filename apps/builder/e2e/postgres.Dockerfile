FROM postgres:16

RUN apt-get update \
  && apt-get install --yes --no-install-recommends postgresql-16-pgtap \
  && rm -rf /var/lib/apt/lists/*
