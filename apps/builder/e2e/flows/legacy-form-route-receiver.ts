import { createServer } from "node:http";

export const startLegacyFormRouteReceiver = async () => {
  const deliveries: Array<{
    method: string;
    slug: string | null;
    routeHeader: string | null;
    body: Record<string, unknown>;
  }> = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }
    deliveries.push({
      method: request.method ?? "",
      slug: new URL(
        request.url ?? "/",
        "http://receiver.local"
      ).searchParams.get("slug"),
      routeHeader: request.headers["x-route-slug"]?.toString() ?? null,
      body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
    });
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ delivered: true }));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected local legacy Form receiver port");
  }
  return {
    url: `http://127.0.0.1:${address.port}/submit`,
    deliveries,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};
