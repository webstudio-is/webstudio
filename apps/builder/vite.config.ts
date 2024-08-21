import { resolve } from "node:path";
import { defineConfig, type CorsOptions, type Plugin } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";
import { vercelPreset } from "@vercel/remix/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import type { IncomingMessage } from "node:http";
import {
  getAuthorizationServerOrigin,
  isBuilderUrl,
} from "./app/shared/router-utils/origins.server";

export default defineConfig(({ mode }) => {
  if (mode === "development") {
    // Enable self-signed certificates for development service 2 service fetch calls.
    // This is particularly important for secure communication with the oauth.ws.token endpoint.
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  return {
    plugins: [
      // Type "thisisunsafe" in Chrome to bypass SSL warnings for wstd.dev domains
      basicSsl() as Plugin<unknown>,
      remix({
        presets: [vercelPreset()],
      }),
    ],
    resolve: {
      conditions: ["webstudio", "import", "module", "browser", "default"],
      alias: [
        {
          find: "~",
          replacement: resolve("app"),
        },
      ],
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    ssr: {
      external: ["@webstudio-is/prisma-client"],
    },
    server: {
      // Service-to-service OAuth token call requires a specified host for the wstd.dev domain
      host: "0.0.0.0",
      // Needed for SSL
      proxy: {},

      cors: ((
        req: IncomingMessage,
        callback: (error: Error | null, options: CorsOptions | null) => void
      ) => {
        // Handle CORS preflight requests in development to mimic Remix production behavior
        if (req.method === "OPTIONS") {
          if (req.headers.origin != null && req.url != null) {
            const url = new URL(req.url, `https://${req.headers.host}`);

            // Allow CORS for /logout path when requested from the authorization server
            if (url.pathname === "/logout" && isBuilderUrl(url.href)) {
              return callback(null, {
                origin: getAuthorizationServerOrigin(url.href),
                preflightContinue: false,
                credentials: true,
              });
            }
          }

          // Respond with method not allowed for other preflight requests
          return callback(null, {
            preflightContinue: false,
            optionsSuccessStatus: 405,
          });
        }

        // Disable CORS for all other requests
        return callback(null, {
          origin: false,
        });
      }) as never,
    },
    envPrefix: "GITHUB_",
  };
});
