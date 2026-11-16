import { createServer, type ServerResponse } from "node:http";

export const concurrencyPath = "/submit?tag=concurrency";

export const startFormCallbackReceiver = async () => {
  const deliveries: Array<Record<string, unknown>> = [];
  const actionDeliveries: string[] = [];
  const legacyRouteDeliveries: Array<{
    method: string;
    slug: string | null;
    routeHeader: string | null;
    body: Record<string, unknown>;
  }> = [];
  const pending: ServerResponse[] = [];
  let requestCount = 0;
  let barrierReached = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const respond = (response: ServerResponse, success: boolean) => {
    response.writeHead(success ? 200 : 503, {
      "content-type": "application/json",
    });
    response.end(JSON.stringify({ delivered: success }));
  };
  const server = createServer(async (request, response) => {
    requestCount += 1;
    const url = new URL(request.url ?? "/", "http://receiver.local");
    if (request.method !== "POST" || url.pathname !== "/submit") {
      response.writeHead(404).end();
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks).toString("utf8");
    if (request.url === "/submit") {
      const callback = JSON.parse(body);
      deliveries.push(callback);
      respond(response, callback.outcome !== "failure");
      return;
    }

    if (url.searchParams.has("slug")) {
      legacyRouteDeliveries.push({
        method: request.method,
        slug: url.searchParams.get("slug"),
        routeHeader: request.headers["x-route-slug"]?.toString() ?? null,
        body: JSON.parse(body),
      });
      respond(response, true);
      return;
    }
    if (request.url !== concurrencyPath) {
      response.writeHead(404).end();
      return;
    }

    actionDeliveries.push(body);
    if (actionDeliveries.length > 3) {
      response.writeHead(409).end();
      return;
    }
    if (barrierReached) {
      respond(response, true);
      return;
    }
    pending.push(response);
    if (pending.length === 1) {
      // A serial dispatcher can never get the second response before the first.
      timeout = setTimeout(() => {
        for (const waiting of pending.splice(0)) {
          waiting.writeHead(504).end("Second Action did not arrive");
        }
      }, 10_000);
    } else {
      barrierReached = true;
      clearTimeout(timeout);
      for (const waiting of pending.splice(0)) {
        respond(waiting, true);
      }
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected local Form receiver port");
  }
  return {
    port: address.port,
    deliveries,
    actionDeliveries,
    legacyRouteDeliveries,
    get requestCount() {
      return requestCount;
    },
    get barrierReached() {
      return barrierReached;
    },
    close: async () => {
      clearTimeout(timeout);
      for (const waiting of pending.splice(0)) {
        waiting.writeHead(503).end();
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
};
