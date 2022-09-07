## CLI Reference

### `--dev`

This flag can be added to any command. It informs the CLI that it’s used in a development environment, which slightly changes its behaviour:

- automatically loads variables from `.env` files,
- uses a lockfile,
- asks for confirmation before applying migrations,
- allows resetting the database using the `reset` command.

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

Deletes all data from the database, and applies all migrations again. Works only with the `--dev` flag.

### `status`

Example: `$ migrations status`

Displays the status of the migrations. Such as which migrations have been applied, which are pending, etc.

### `resolve <applied|rolled-back> <name>`

Example: `$ migrations resolve applied 20220905153337_move_projects_to_new_table`

Marks a failed migration as applied or rolled back. You can see information about failed migrations using the `status` command.

Note: this does not fix any issues that might have been caused by the failed run of the migration. You need to investigate and fix them manually before running the `resolve` command.
