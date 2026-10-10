import { createServer } from "node:http";

export const startFormCallbackReceiver = async () => {
  const deliveries: Array<Record<string, unknown>> = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    deliveries.push(body);
    const success = body.outcome !== "failure";
    response.writeHead(success ? 200 : 503, {
      "content-type": "application/json",
    });
    response.end(JSON.stringify({ delivered: success }));
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
    url: `http://127.0.0.1:${address.port}/submit`,
    port: address.port,
    deliveries,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};
