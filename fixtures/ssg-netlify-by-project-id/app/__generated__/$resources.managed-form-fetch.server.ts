import { createNodeProtectedResourceFetch } from "@webstudio-is/sdk/protected-resource-fetch-node";
export const createManagedFormEmailSender = (_input: { context: unknown; formData: FormData; projectId: string }) => undefined;
export const validateManagedFormEmail = (_request: unknown, _formData: FormData) => undefined;
export const createManagedFormResourceFetch = ({ request, context, projectDomain }: { request: Request; context: unknown; projectDomain?: string }) => {
  void context;
  return createNodeProtectedResourceFetch({
    projectId: "8a7358b1-7de3-459d-b7b1-56dddfb6ce1e",
    matchSubdomains: false,
    deniedHostnames: [
      new URL(request.url).hostname,
      projectDomain,
      ...[],
    ].filter((hostname): hostname is string => hostname !== undefined),
  });
};
