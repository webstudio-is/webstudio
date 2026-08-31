import { describe, expect, test } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const cliRoot = process.cwd();

const writeModule = async (path: string, contents: string) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
};

const importTempModule = async <Module>(path: string) => {
  return (await import(
    `${pathToFileURL(path).href}?test=${crypto.randomUUID()}`
  )) as Module;
};

const writeTempApp = async (tempDir: string) => {
  await writeModule(
    join(tempDir, "app/redirect-url.ts"),
    `
      export const redirectRequest = (request, redirects) => {
        const pathname = new URL(request.url).pathname;
        const redirect = redirects.find((redirect) => redirect.old === pathname);
        if (redirect === undefined) {
          return;
        }
        return new Response(null, {
          status: redirect.status,
          headers: { Location: redirect.new },
        });
      };
    `
  );
  await writeModule(
    join(tempDir, "app/__generated__/$resources.redirects.ts"),
    `export const redirects = [{ old: "/missing", new: "/target", status: 301 }];`
  );

  await writeModule(
    join(tempDir, "workers/app.ts"),
    await readFile(
      join(cliRoot, "templates/react-router-cloudflare/workers/app.ts"),
      "utf8"
    )
  );
};

describe("cloudflare redirect entrypoint", () => {
  test("redirects before unmatched routes reach react-router", async () => {
    const tempDir = await mkdtemp(join(cliRoot, ".tmp-cloudflare-redirect-"));
    try {
      await writeTempApp(tempDir);
      const worker = await importTempModule<{
        default: {
          fetch: (
            request: Request,
            env: Record<string, never>,
            ctx: Record<string, never>
          ) => Response | Promise<Response>;
        };
      }>(join(tempDir, "workers/app.ts"));
      const response = await worker.default.fetch(
        new Request("https://example.com/missing"),
        {},
        {}
      );

      expect(response.status).toBe(301);
      expect(response.headers.get("Location")).toBe("/target");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
