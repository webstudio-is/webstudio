import { createServer } from "node:http";

export type FormRuntimeDelivery = {
  path: "/submit" | "/reject";
  status: 200 | 503;
};

// This receiver deliberately records neither request headers nor request bodies.
export const startFormRuntimeReceiver = async () => {
  const deliveries: FormRuntimeDelivery[] = [];
  const server = createServer(async (request, response) => {
    let bytes = 0;
    for await (const chunk of request) {
      bytes += Buffer.byteLength(chunk);
      if (bytes > 64_000) {
        response.writeHead(413).end();
        return;
      }
    }
    const path = request.url;
    if (
      request.method !== "POST" ||
      (path !== "/submit" && path !== "/reject")
    ) {
      response.writeHead(404).end();
      return;
    }
    const status = path === "/submit" ? 200 : 503;
    deliveries.push({ path, status });
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify({ delivered: status === 200 }));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected a loopback receiver port");
  }
  return {
    port: address.port,
    deliveries,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};
