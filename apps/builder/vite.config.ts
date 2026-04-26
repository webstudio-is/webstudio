import path, { resolve } from "node:path";
import { defineConfig, type CorsOptions } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";
import { vercelPreset } from "@vercel/remix/vite";
import type { IncomingMessage } from "node:http";
import pc from "picocolors";

import {
  getAuthorizationServerOrigin,
  isBuilderUrl,
} from "./app/shared/router-utils/origins";
import { readFileSync, existsSync } from "node:fs";
import fg from "fast-glob";

const rootDir = ["..", "../..", "../../.."]
  .map((dir) => path.join(__dirname, dir))
  .find((dir) => existsSync(path.join(dir, ".git")));

const hasPrivateFolders =
  fg.sync([path.join(rootDir ?? "", "packages/*/private-src/*")], {
    ignore: ["**/node_modules/**"],
  }).length > 0;

const conditions = hasPrivateFolders
  ? ["webstudio-private", "webstudio"]
  : ["webstudio"];

export default defineConfig(({ mode }) => {
  if (mode === "development") {
    // Enable self-signed certificates for development service 2 service fetch calls.
    // This is particularly important for secure communication with the oauth.ws.token endpoint.
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  return {
    plugins: [
      remix({
        presets: [vercelPreset()],
        future: {
          v3_lazyRouteDiscovery: false,
          v3_relativeSplatPath: false,
          v3_singleFetch: false,
          v3_fetcherPersist: false,
          v3_throwAbortReason: false,
        },
      }),
      {
        name: "request-timing-logger",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Some dev proxies can forward HTTP/2 pseudo-headers such as
            // ":method". Remix converts Node headers to Fetch Headers, where
            // those names are invalid and crash before the request reaches app
            // code. Vite still needs a normal req.url, so preserve ":path"
            // before removing the pseudo-headers.
            if (req.url === undefined) {
              const path = req.headers[":path"];
              if (typeof path === "string") {
                req.url = path;
              }
            }
            for (const header of Object.keys(req.headers)) {
              if (header.startsWith(":")) {
                delete req.headers[header];
              }
            }
            // Pre-bundled dep chunks must never be served from a stale browser
            // cache. Vite uses ?v= to bust the cache, but some browsers (or
            // service workers) still serve cached chunks with old hashes,
            // causing duplicate-React errors during hydration. no-store removes
            // the files from the browser cache entirely.
            if (req.url?.includes("/node_modules/.vite/deps/")) {
              res.setHeader("Cache-Control", "no-store");
            }
            const start = Date.now();
            res.on("finish", () => {
              const duration = Date.now() - start;
              if (
                !(
                  req.url?.startsWith("/@") ||
                  req.url?.startsWith("/app") ||
                  req.url?.includes("/node_modules")
                )
              ) {
                console.info(
                  `[${req.method}] ${req.url} - ${duration}ms : ${pc.dim(req.headers.host)}`
                );
              }
            });
            next();
          });
        },
      },
    ],
    resolve: {
      conditions: [...conditions, "browser", "development|production"],
      alias: [
        {
          find: "~",
          replacement: resolve("app"),
        },

        // before 2,899.74 kB, after 2,145.98 kB
        {
          find: "@supabase/node-fetch",
          replacement: resolve("./app/shared/empty.ts"),
        },
      ],
    },
    ssr: {
      resolve: {
        conditions: [...conditions, "node", "development|production"],
      },
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    server: {
      // Service-to-service OAuth token call requires a specified host for the wstd.dev domain
      host: "wstd.dev",
      // Vite 6 creates an HTTP/2 dev server when HTTPS is enabled and no proxy
      // object exists. Remix/Vite's middleware stack expects HTTP/1-style
      // IncomingMessage URLs, so keep proxy configured. In remote workspaces,
      // browser-side localhost points at the user's machine, not this dev
      // container, so websocket connections for the local collab worker go
      // through the builder origin and are proxied to PartyKit.
      proxy: {
        "/parties": {
          target: "http://127.0.0.1:1999",
          ws: true,
          changeOrigin: true,
        },
      },
      https: {
        key: readFileSync("../../https/privkey.pem"),
        cert: readFileSync("../../https/fullchain.pem"),
      },
      cors: ((
        req: IncomingMessage,
        callback: (error: Error | null, options: CorsOptions | null) => void
      ) => {
        // Handle CORS preflight requests in development to mimic Remix production behavior
        if (req.method === "OPTIONS" || req.method === "POST") {
          if (req.headers.origin != null && req.url != null) {
            const url = new URL(req.url, `https://${req.headers.host}`);

            // Allow CORS for /builder-logout path when requested from the authorization server
            if (url.pathname === "/builder-logout" && isBuilderUrl(url.href)) {
              return callback(null, {
                origin: getAuthorizationServerOrigin(url.href),
                preflightContinue: false,
                credentials: true,
              });
            }
          }

          if (req.method === "OPTIONS") {
            // Respond with method not allowed for other preflight requests
            return callback(null, {
              preflightContinue: false,
              optionsSuccessStatus: 405,
            });
          }
        }

        // Disable CORS for all other requests
        return callback(null, {
          origin: false,
        });
      }) as never,
    },
    envPrefix: ["GITHUB_", "PUBLIC_"],
  };
});
