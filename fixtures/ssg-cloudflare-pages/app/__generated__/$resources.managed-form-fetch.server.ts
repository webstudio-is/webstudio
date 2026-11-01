import { createNodeProtectedResourceFetch } from "@webstudio-is/sdk/protected-resource-fetch-node";
export const createManagedFormEmailSender = (_input: { context: unknown; formData: FormData; projectId: string }) => undefined;
export const validateManagedFormEmail = (_request: unknown, _formData: FormData) => undefined;
export const createManagedFormResourceFetch = ({ request, context, projectDomain }: { request: Request; context: unknown; projectDomain?: string }) => {
  void context;
  return createNodeProtectedResourceFetch({
    projectId: "d845c167-ea07-4875-b08d-83e97c09dcce",
    matchSubdomains: false,
    deniedHostnames: [
      new URL(request.url).hostname,
      projectDomain,
      ...[],
    ].filter((hostname): hostname is string => hostname !== undefined),
  });
};
