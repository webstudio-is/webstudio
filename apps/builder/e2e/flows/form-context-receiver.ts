import { createServer } from "node:http";

type Delivery = {
  method: string;
  languageHeader: string | undefined;
  body: Record<string, unknown>;
};

export const startFormContextReceiver = async () => {
  const deliveries: Delivery[] = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }
    deliveries.push({
      method: request.method ?? "",
      languageHeader: request.headers["x-form-language"] as string | undefined,
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
    throw new Error("Expected local Form receiver port");
  }
  return {
    port: address.port,
    deliveries,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};
