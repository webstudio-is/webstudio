import {
  createProtectedResourceFetch,
  type ProtectedResourceFetch,
} from "@webstudio-is/sdk/protected-resource-fetch";
import { createNodeProtectedResourceFetch } from "@webstudio-is/sdk/protected-resource-fetch-node";

const browserFetch: ProtectedResourceFetch = createProtectedResourceFetch({
  transport: async () => ({ response: new Response() }),
  deniedHostnames: [],
});
const nodeFetch: ProtectedResourceFetch = createNodeProtectedResourceFetch();

void browserFetch;
void nodeFetch;
