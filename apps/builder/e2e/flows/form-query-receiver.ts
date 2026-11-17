import { createServer } from "node:http";

export const startFormQueryReceiver = async () => {
  const deliveries: Array<{
    method: string;
    pathname: string;
    search: string;
    tag: string | null;
    contentType: string;
    body: Record<string, unknown>;
  }> = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }
    const url = new URL(request.url ?? "/", "http://receiver.local");
    try {
      deliveries.push({
        method: request.method ?? "",
        pathname: url.pathname,
        search: url.search,
        tag: url.searchParams.get("tag"),
        contentType: request.headers["content-type"] ?? "",
        body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
      });
    } catch {
      response.writeHead(400).end();
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ delivered: true }));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected local Form query receiver port");
  }
  return {
    port: address.port,
    deliveries,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};
