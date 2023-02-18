require("./env-check");
const express = require("express");
const compression = require("compression");
const morgan = require("morgan");
const { createRequestHandler } = require("@remix-run/express");
const serverBuild = require("./api/index.js");

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

app.all(
  "*",
  createRequestHandler({
    build: serverBuild,
    mode: process.env.NODE_ENV,
  })
);

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
