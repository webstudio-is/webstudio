import {
  createCloudflareProtectedResourceFetch,
  getDeniedResourceHostnames,
} from "@webstudio-is/sdk/protected-resource-fetch";
export const createManagedFormResourceFetch = ({ request, context, projectDomain }: { request: Request; context: unknown; projectDomain?: string }) => {
  void context;
  return createCloudflareProtectedResourceFetch({
    ownZoneHostnames: getDeniedResourceHostnames([
      new URL(request.url).hostname,
      projectDomain,
    ]) as [string, ...string[]],
  });
};
