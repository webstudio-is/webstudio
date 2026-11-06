import { createNodeProtectedResourceFetch } from "@webstudio-is/sdk/protected-resource-fetch-node";
export const createManagedFormEmailSender = (_input: { context: unknown; formData: FormData; projectId: string }) => undefined;
export const validateManagedFormEmail = (_request: unknown, _formData: FormData) => undefined;
export const createManagedFormResourceFetch = ({ request, context, projectDomain }: { request: Request; context: unknown; projectDomain?: string }) => {
  void context;
  return createNodeProtectedResourceFetch({
    projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
    matchSubdomains: false,
    deniedHostnames: [
      new URL(request.url).hostname,
      projectDomain,
      ...["webstudio-fixture-project-a-0su3o"],
    ].filter((hostname): hostname is string => hostname !== undefined),
  });
};
