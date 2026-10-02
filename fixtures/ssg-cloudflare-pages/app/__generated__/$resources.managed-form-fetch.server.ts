import { getDeniedResourceHostnames } from "@webstudio-is/sdk/protected-resource-fetch";
import { createNodeProtectedResourceFetch } from "@webstudio-is/sdk/protected-resource-fetch-node";
export const createManagedFormResourceFetch = ({ request, context, projectDomain }: { request: Request; context: unknown; projectDomain?: string }) => {
  void context;
  return createNodeProtectedResourceFetch({
    deniedHostnames: getDeniedResourceHostnames([
      new URL(request.url).hostname,
      projectDomain,
    ]),
  });
};
