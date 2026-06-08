import { installGlobals } from "@remix-run/node";
import { createRequestHandler as createExpressRequestHandler } from "@remix-run/express";
import type { ServerBuild } from "@remix-run/server-runtime";
import express from "express";
import { readdirSync, readFileSync } from "node:fs";
import https from "node:https";
import path from "node:path";
import { pathToFileURL } from "node:url";

installGlobals({ nativeFetch: true });

const resolveServerBuildPath = () => {
  const serverDirectory = path.resolve("build/server");
  const serverBuild = readdirSync(serverDirectory, {
    withFileTypes: true,
  }).find((entry) => entry.isDirectory());

  if (serverBuild === undefined) {
    throw new Error(`Could not find server build in ${serverDirectory}`);
  }

  return path.join(serverDirectory, serverBuild.name, "index.js");
};

const start = async () => {
  const build = (await import(
    pathToFileURL(resolveServerBuildPath()).href
  )) as ServerBuild;
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST;
  const app = express();

  app.disable("x-powered-by");
  app.use(
    build.publicPath,
    express.static(build.assetsBuildDirectory, {
      immutable: true,
      maxAge: "1y",
    })
  );
  app.use(express.static("public", { maxAge: "1h" }));
  app.use(
    createExpressRequestHandler({
      build,
      mode: "production",
    })
  );

  const server = https.createServer(
    {
      cert: readFileSync(path.resolve("../../https/fullchain.pem")),
      key: readFileSync(path.resolve("../../https/privkey.pem")),
    },
    app
  );

  server.listen(port, host, () => {
    console.info(`[builder-e2e] https://${host ?? "localhost"}:${port}`);
  });

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
      server.close((error) => {
        if (error !== undefined) {
          console.error(error);
        }
      });
    });
  }
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
