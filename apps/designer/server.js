import { createRequestHandler, RequestHandler } from "@remix-run/vercel";
import * as build from "@remix-run/dev/server-build";

const baseHandler = createRequestHandler({ build, mode: process.env.NODE_ENV });

const handler: RequestHandler = async (request, response) => {
  const start = Date.now();
  await baseHandler(request, response);
  // eslint-disable-next-line no-console
  console.log(`${request.method} ${request.url} ${Date.now() - start}ms`);
};

export default handler;
