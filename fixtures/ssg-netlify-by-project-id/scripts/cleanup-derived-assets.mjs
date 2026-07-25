import { rm } from "node:fs/promises";

// Assets query indexes are build inputs for SSG. Vike has serialized every
// page's resource data after prerendering, so the static deployment no longer
// needs the runtime index.
await rm(new URL("../dist/client/assets/db", import.meta.url), {
  recursive: true,
  force: true,
});
