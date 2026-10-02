import { installGlobals } from "@remix-run/node";
import { createRequestHandler as createExpressRequestHandler } from "@remix-run/express";
import type { ServerBuild } from "@remix-run/server-runtime";
import express from "express";
import { matchRoutes, type RouteObject } from "react-router-dom";
import { readdirSync, readFileSync } from "node:fs";
import https from "node:https";
import path from "node:path";
import { pathToFileURL } from "node:url";

installGlobals({ nativeFetch: true });

const start = async () => {
  // Resource E2E fixtures use loopback URLs. Keep this exception limited to
  // the dedicated test server; production uses the public-address guard.
  process.env.E2E_ALLOW_LOCAL_RESOURCE_URLS = "true";
  const serverDirectory = path.resolve("build/server");
  const builds = await Promise.all(
    readdirSync(serverDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const filename = path.join(serverDirectory, entry.name, "index.js");
        return (await import(pathToFileURL(filename).href)) as ServerBuild;
      })
  );
  const [build] = builds;
  if (build === undefined) {
    throw new Error(`Could not find server build in ${serverDirectory}`);
  }
  // Route-specific Vercel config produces multiple server bundles. Match
  // against the complete route tree before dispatching to its owning bundle.
  const routesById = new Map<string, RouteObject>();
  const handlers = new Map<string, express.RequestHandler>();
  for (const bundle of builds) {
    const handler = createExpressRequestHandler({
      build: bundle,
      mode: "production",
    });
    for (const route of Object.values(bundle.routes)) {
      routesById.set(route.id, {
        id: route.id,
        path: route.path,
        index: route.index,
      });
      handlers.set(route.id, handler);
    }
  }
  const routes: RouteObject[] = [];
  const manifest = Object.assign(
    {},
    ...builds.map((bundle) => bundle.routes)
  ) as ServerBuild["routes"];
  for (const route of Object.values(manifest)) {
    const parent =
      route.parentId === undefined ? undefined : routesById.get(route.parentId);
    const siblings = parent === undefined ? routes : (parent.children ??= []);
    siblings.push(routesById.get(route.id)!);
  }
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
  app.use((request, response, next) => {
    const matches = matchRoutes(routes, request.path, build.basename);
    const routeId = matches?.at(-1)?.route.id ?? "root";
    return handlers.get(routeId)!(request, response, next);
  });

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
