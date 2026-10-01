import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { join, posix } from "node:path";
import express from "express";
import compression from "compression";
import { createRequestHandler } from "@react-router/express";

/**
 * @param {{ build: import("react-router").ServerBuild, trustProxy?: string[] | false }} options
 * @returns {import("express").Express}
 */
export const createApp = ({ build, trustProxy = false }) => {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", trustProxy);
  app.use(compression());
  app.use(
    posix.join(build.publicPath, "assets"),
    express.static(join(build.assetsBuildDirectory, "assets"), {
      immutable: true,
      maxAge: "1y",
    })
  );
  app.use(build.publicPath, express.static(build.assetsBuildDirectory));
  app.use(express.static("public", { maxAge: "1h" }));
  app.all("*", createRequestHandler({ build, mode: process.env.NODE_ENV }));
  return app;
};

if (
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.env.NODE_ENV ??= "production";
  const buildPath = "./build/server/index.js";
  const build = await import(buildPath);
  const trustProxy = process.env.TRUST_PROXY?.split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  const app = createApp({ build, trustProxy });
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? "0.0.0.0";
  const server = app.listen(port, host, () => {
    console.log(`Webstudio server listening on http://${host}:${port}`);
  });
  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.once(signal, () => server.close(console.error));
  }
}
