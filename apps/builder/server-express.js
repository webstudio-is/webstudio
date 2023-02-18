require("./env-check");
const path = require("node:path");
const express = require("express");
const compression = require("compression");
const morgan = require("morgan");
const { createRequestHandler } = require("@remix-run/express");

const BUILD_DIR = path.join(process.cwd(), "build");

const app = express();

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

// Remix fingerprints its assets so we can cache forever.
app.use(
  "/build",
  express.static("public/build", { immutable: true, maxAge: "1y" })
);

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static("public", { maxAge: "1h" }));

app.use(morgan("tiny"));

function purgeRequireCache() {
  // purge require cache on requests for "server side HMR" this won't let
  // you have in-memory objects between requests in development,
  // alternatively you can set up nodemon/pm2-dev to restart the server on
  // file changes, but then you'll have to reconnect to databases/etc on each
  // change. We prefer the DX of this, so we've included it for you by default
  for (const key in require.cache) {
    if (key.startsWith(BUILD_DIR)) {
      delete require.cache[key];
    }
  }
}

app.all("*", (req, res, next) => {
  purgeRequireCache();

  return createRequestHandler({
    build: require("./api/index.js"),
    mode: process.env.NODE_ENV,
  })(req, res, next);
});

const port = Number(process.env.PORT) || 3000;

const server = app.listen(port, "0.0.0.0", () => {
  const address = server.address();
  if (address) {
    console.log(
      `Remix App Server started at http://localhost:${port} (http://${address.address}:${port})`
    );
  } else {
    console.log(`Remix App Server started at http://localhost:${port}`);
  }
});

process.once("SIGTERM", () => server.close(console.error));
process.once("SIGINT", () => server.close(console.error));
