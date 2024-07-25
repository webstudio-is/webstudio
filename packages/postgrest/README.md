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

## Next steps.

Use https://supabase.com/docs/reference/cli/supabase-db-start or directly https://github.com/djrobstep/migra for migrations.

Supabase can be used with `--db-url` flag to not reproduce "local" env
