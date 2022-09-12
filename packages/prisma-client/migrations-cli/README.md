## Intro

This is a drop-in replacement for Prisma's migration engine. It adds:

- an ability to write a data migration in TypeScript,
- an ability to write a rollback for a migration (\* to be implemented).

A regular Prisma's migrations directory looks like this:

```
migrations/
  20220601192603_start/migration.sql
  20220608130959_adduser/migration.sql
```

With the new engine it will look something like this:

```
migrations/
  20220601192603_start/
    migration.sql
  20220608130959_adduser/
    migration.sql
    rollback.sql
  20220608130959_movedata/
    client/
      ...
    migration.ts
    rollback.ts
```

In a TypeScript migration file, you can use a Prisma client generated specifically for this migration. This client is frozen in time at the moment when you create a migration. So if at a later point a model will be removed from the main Prisma schema, in the migration you'll still have access to the old model. In other words, the Client in a migration corresponds to a state of the database where the preceding migrations have been applied, but the succeeding haven't.

## Use cases

### How do I start using the new engine?

- Stop using `prisma migrate *` commands
- Start using `migrations *` commands instead

NOTE: If this becomes a library there should be more istructions here.

### How do I setup a new database for development?

- Install Postgres and create a new database.
- Make sure your `schema.prisma` file points to the correct database.
- Apply migrations by running `migrations migrate --dev`.

### I've pulled in migrations created by someone else. How do I apply them?

- Run `migrations migrate --dev`

### I've changed models in `schema.prisma`. How do I update the database?

- Create a schema migration by running `migrations create-schema <name>`.
- Apply the migration by running `migrations migrate --dev`.

### I need to change schema in a way that involves moving data to a new location.

- Make changes to `schema.prisma` in a way that both the old and the new locations for the data are defined.
- Create a schema migration by running `migrations create-schema <name>`, and apply it by running `migrations migrate --dev`.
- Create a data migration by running `migrations create-data <name>`.
- Edit the data migration file to move the data to the new location, and apply the migration.
- Make changes to `schema.prisma` to remove the old models or fields that are no longer needed.
- Create a schema migration by running `migrations create-schema <name>`, and apply it.

### A migration has failed. What do I do?

You have several options:

1. If you have a backup, you can restore it.
1. If you don't care about the data in the database, you can reset the database by running `migrations reset [--dev]`.
1. Fix the issues manually.
   - Figure out what changes the migration managed to make to the database.
   - Revert the changes manually by any means you like. E.g. using a Postgres client.
   - Alternatively, manually perform the remaining steps of the migration.
   - Run `migrations resolve applied <name>` or `migrations resolve rolled-back <name>` to mark the migration as applied or rolled-back.

### How do I apply migrations in a deployment environment?

- Make sure your `schema.prisma` file points to the correct database.
- Add `migrations migrate --force` to your deploy script.

## CLI Reference

### `--dev`

This flag can be added to any command. It informs the CLI that it’s used in a development environment, which slightly changes its behaviour:

- automatically loads variables from `.env` files,
- uses a lockfile to avoid running more than one migration process at the same time.

### `--force`

This flag can be added to any command. It prevents the CLI from asking for confirmation before executing the command.

### `create-schema <name>`

Example: `$ migrations create-schema add_projects_table`

Creates a schema migration. Compares the `schema.prisma` with the actual tables in the database, and creates a migration that changes the database to match the schema.

Note: this may cause a loss of data if the migration removes tables or columns. Open the generated `migration.sql` file to see the warnings about potential data losses. Unless the data is not needed, you should first move it to a new location using a data-migration, and only then delete the old tables or columns.

### `create-data <name>`

Example: `$ migrations create-data move_projects_to_new_table`

Creates a data migration. Creates a migration with an empty `migration.ts` file, which you can open in an editor and write the actual migration code.

### `migrate`

Example: `$ migrations migrate`

Applies all pending migrations. Looks for migrations in the migrations directory that have not been applied to the database yet, and applies them.

### `reset`

Example: `$ migrations reset`

Deletes all data from the database, and applies all migrations again.

### `status`

Example: `$ migrations status`

Displays the status of the migrations. Such as which migrations have been applied, which are pending, etc.

### `resolve <applied|rolled-back> <name>`

Example: `$ migrations resolve applied 20220905153337_move_projects_to_new_table`

Marks a failed migration as applied or rolled back. You can see information about failed migrations using the `status` command.

Note: this does not fix any issues that might have been caused by the failed run of the migration. You need to investigate and fix them manually before running the `resolve` command.

## Comparison to Prisma (v4.x)

<!-- prettier-ignore-start -->
| Action | Prisma command | Our command | Notable differences |
| -- | -- | -- | -- |
| Creating a schema migration | `prisma migrate dev --create-only` | `migrations create-schema` | If there are pending migrations, Prisma will apply them. We will ask the user to apply. |
| Creating a data migration | N/a | `migrations create-data`  | |
| Applying migrations in dev | `prisma migrate dev` | `migrations migrate --dev` | We don't do [schema drift detection](https://www.prisma.io/docs/concepts/components/prisma-migrate/shadow-database#detecting-schema-drift) |
| Applying migrations in prod | `prisma migrate deploy` | `migrations migrate`  | |
| Resolving failed migrations | `prisma migrate resolve --<applied\|rolled-back> <name>` | `migrations resolve <applied\|rolled-back> <name>` | |
| Status of migrations | `prisma migrate status` | `migrations status` | |
| Reseting database | `prisma migrate reset` | `migrations reset --dev` | |
<!-- prettier-ignore-end -->

Also, if a migration file of an applied migration is missing or have been modified, Prisma may treats this as a fatal issue. We also detect these issues and they appear in the `status` output, but we don't do anything beyond that.
