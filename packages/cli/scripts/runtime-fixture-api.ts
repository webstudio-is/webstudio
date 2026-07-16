import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import {
  publicApiContractVersion,
  publicApiOperationRequiresServerSupport,
  publicApiOperations,
} from "@webstudio-is/protocol";

export type RuntimeFixtureRequest = {
  request: IncomingMessage;
  response: ServerResponse;
  pathname: string;
  operationPath: string;
  readInput: () => Promise<unknown>;
};

export const runtimeFixturePermissions = {
  canView: true,
  canEdit: true,
  canBuild: true,
  canAdmin: true,
  canUseApi: true,
  apiContract: {
    version: publicApiContractVersion,
    operationIds: publicApiOperations.flatMap((operation) =>
      publicApiOperationRequiresServerSupport(operation) ? [operation.id] : []
    ),
  },
} as const;

export const publicApiCommandByOperationId = new Map(
  publicApiOperations.map((operation) => [operation.id, operation.command])
);

const readTrpcInput = async (request: IncomingMessage) => {
  const url = new URL(request.url ?? "", "http://127.0.0.1");
  const source =
    request.method === "GET"
      ? (url.searchParams.get("input") ?? "{}")
      : await new Promise<string>((resolve, reject) => {
          let body = "";
          request.setEncoding("utf8");
          request.on("data", (chunk) => {
            body += chunk;
          });
          request.on("end", () => resolve(body || "{}"));
          request.on("error", reject);
        });
  const batch = JSON.parse(source) as Record<string, unknown>;
  const first = batch["0"];
  if (typeof first !== "object" || first === null || Array.isArray(first)) {
    return {};
  }
  return "json" in first ? ((first as { json?: unknown }).json ?? {}) : first;
};

const closeServer = async (
  server: ReturnType<typeof createServer>
): Promise<void> => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error === undefined ? resolve() : reject(error)))
  );
};

export const startRuntimeFixtureApi = async (
  handle: (request: RuntimeFixtureRequest) => Promise<unknown>
) => {
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url ?? "", "http://127.0.0.1").pathname;
      const data = await handle({
        request,
        response,
        pathname,
        operationPath: pathname.replace(/^\/trpc\/(?:api\.)?/, ""),
        readInput: () => readTrpcInput(request),
      });
      if (response.writableEnded) {
        return;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify([{ result: { data } }]));
    } catch (error) {
      if (response.writableEnded) {
        return;
      }
      response.writeHead(500, { "content-type": "application/json" });
      response.end(
        JSON.stringify([
          {
            error: {
              message: error instanceof Error ? error.message : String(error),
              code: -32603,
              data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
            },
          },
        ])
      );
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Fixture API address is unavailable.");
  }
  return {
    server,
    origin: `http://127.0.0.1:${address.port}`,
    close: () => closeServer(server),
  };
};
