This directory stores the optional e2e database schema snapshot.

The snapshot should contain database structure only. Test data belongs in the
typed fixtures under `apps/builder/e2e/fixtures`.

Refresh the snapshot with:

```sh
pnpm e2e:builder:update-schema
```
