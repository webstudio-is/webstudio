/**
 * Custom production server replacing remix-serve.
 *
 * The sole reason this file exists is to enable Express "trust proxy" so that
 * req.protocol reflects the original scheme (https) forwarded by Traefik,
 * rather than the internal http used between the proxy and the container.
 * Without this, the OAuth redirect_uri sent by the canvas is constructed with
 * http:// instead of https://, causing the token exchange to fail.
 */
import { createRequestHandler } from "@remix-run/express";
import compression from "compression";
import express from "express";
import { pathToFileURL } from "node:url";

// @remix-run/web-fetch (bundled in the Remix server build) creates
// new Response(body, { status: 204 }) with a non-null body, which
// undici (Node 18+) rejects because 204/205/304 are "null body statuses"
// per the WHATWG spec. Patch globalThis.Response to null the body for
// these statuses before the request handler runs.
const _OriginalResponse = globalThis.Response;
globalThis.Response = class Response extends _OriginalResponse {
  constructor(body, init) {
    super([101, 204, 205, 304].includes(init?.status) ? null : body, init);
  }
};

const BUILD_PATH = "/app/build/server/index.js";

const build = await import(pathToFileURL(BUILD_PATH).href);

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);

app.use(compression());

// Hashed client assets — immutable, 1-year cache
app.use(
  build.publicPath,
  express.static(build.assetsBuildDirectory, { immutable: true, maxAge: "1y" })
);

// Static files from /app/public
app.use(express.static("public", { maxAge: "1h" }));

// Health check for Docker / Coolify
app.get("/health", (_req, res) => res.sendStatus(200));

// Remix request handler
app.all("*", createRequestHandler({ build, mode: process.env.NODE_ENV }));

const port = parseInt(process.env.PORT || "3000", 10);
app.listen(port, () => {
  console.info(`[server] http://localhost:${port}`);
});
