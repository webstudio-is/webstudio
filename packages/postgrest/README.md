# Postgrest

## Postgrest-js

[postgrest-js best doc](https://supabase.com/docs/reference/javascript/select)

## Generated Types

```bash
pnpm generate-types
```

or in case of non devcontainer environment

```bash
docker compose exec -iT app bash
cd /workspaces/webstudio/packages/postgrest
pnpm generate-types
```

## Playground

```bash
pnpm playground ./playground/{file}.ts
# OR
pnpm tsx --env-file ../../apps/builder/.env ./playground/{file}.ts
```

## Next steps.

Use https://supabase.com/docs/reference/cli/supabase-db-start or directly https://github.com/djrobstep/migra for migrations.

Supabase can be used with `--db-url` flag to not reproduce "local" env

## Sql testing

```sql
CREATE SCHEMA IF NOT EXISTS pgtap;
DROP EXTENSION pgtap;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA pgtap;
```

```bash
pnpx supabase test new latest-builds
```

```shell
docker run --rm --network host -v ./supabase/tests:/tests -e PGOPTIONS='--search_path=pgtap,public' supabase/pg_prove:3.36 pg_prove -d "postgresql://postgres:pass@localhost/webstudio" --ext .sql /tests
# OR
pnpm run db-test
```
