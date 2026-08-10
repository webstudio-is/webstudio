import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { pipeline } from "node:stream/promises";

const rootDirectory = process.env.VISUAL_STORYBOOK_DIRECTORY;
const port = Number(process.env.VISUAL_STORYBOOK_PORT);

if (rootDirectory === undefined || Number.isInteger(port) === false) {
  throw new Error(
    "VISUAL_STORYBOOK_DIRECTORY and VISUAL_STORYBOOK_PORT are required"
  );
}

const root = path.resolve(rootDirectory);
const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(
      request.url ?? "/",
      `http://${request.headers.host ?? "127.0.0.1"}`
    );
    const relativePath = decodeURIComponent(requestUrl.pathname).replace(
      /^\/+/,
      ""
    );
    let filePath = path.resolve(root, relativePath);
    if (
      filePath !== root &&
      filePath.startsWith(`${root}${path.sep}`) === false
    ) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    const fileStats = await stat(filePath);
    if (fileStats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type":
        contentTypes[path.extname(filePath).toLowerCase()] ??
        "application/octet-stream",
    });
    await pipeline(createReadStream(filePath), response);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(500).end("Internal server error");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.info(`Serving ${root} at http://127.0.0.1:${port}`);
});

const close = () => server.close(() => process.exit());
process.on("SIGINT", close);
process.on("SIGTERM", close);
