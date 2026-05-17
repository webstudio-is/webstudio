import { env } from "node:process";
import type { LoaderFunctionArgs } from "react-router";
import {
  createIPX,
  createIPXH3Handler,
  ipxFSStorage,
  ipxHttpStorage,
} from "ipx";
import { createApp, toWebHandler } from "h3";

const domains = env.DOMAINS?.split(/\s*,\s*/) ?? [];

const ipx = createIPX({
  // After build, Vite moves public/ assets into build/client/ — use that as the FS root.
  storage: ipxFSStorage({ dir: "./build/client" }),
  httpStorage: ipxHttpStorage({ domains }),
});

const handleRequest = toWebHandler(
  createApp().use("/_image", createIPXH3Handler(ipx))
);

export const loader = async (args: LoaderFunctionArgs) => {
  return handleRequest(args.request);
};
