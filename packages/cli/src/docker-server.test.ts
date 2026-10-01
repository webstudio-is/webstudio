import { request } from "node:http";
import type { AddressInfo } from "node:net";
import { expect, test } from "vitest";
import type { ServerBuild } from "react-router";
import { createApp } from "../templates/react-router-docker/server.mjs";

const build: ServerBuild = {
  entry: { module: { default: () => new Response() } },
  routes: {
    root: {
      id: "root",
      path: "*",
      module: {
        // Resource routes have no default export.
        default: undefined as never,
        action: ({ request }) => Response.json({ url: request.url }),
      },
    },
  },
  assets: {
    entry: { imports: [], module: "" },
    routes: {},
    url: "",
    version: "test",
  },
  publicPath: "/",
  assetsBuildDirectory: "build/client",
  future: { unstable_middleware: false, unstable_subResourceIntegrity: false },
  ssr: true,
  isSpaMode: false,
  prerender: [],
};

test("Docker requests use HTTPS information only from a configured proxy", async () => {
  for (const trustProxy of [["loopback"], false] as const) {
    const app = createApp({
      build,
      trustProxy: trustProxy === false ? false : [...trustProxy],
    });
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    try {
      const { port } = server.address() as AddressInfo;
      const response = await new Promise<{ status?: number; body: string }>(
        (resolve, reject) => {
          const req = request(
            `http://127.0.0.1:${port}/submit?page=1`,
            {
              method: "POST",
              headers: {
                Host: "internal.example",
                Origin: "https://my-site.example",
                "X-Forwarded-Host": "my-site.example",
                "X-Forwarded-Proto": "https",
                "Content-Type": "application/x-www-form-urlencoded",
              },
            },
            (res) => {
              let body = "";
              res.on("data", (chunk) => (body += chunk));
              res.on("end", () => resolve({ status: res.statusCode, body }));
              res.on("error", reject);
            }
          );
          req.on("error", reject);
          req.end("name=Ada");
        }
      );
      expect(response.status).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        url:
          trustProxy === false
            ? "http://internal.example/submit?page=1"
            : "https://my-site.example/submit?page=1",
      });
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      });
    }
  }
});
