import {
  createCloudflareProtectedResourceFetch,
  getDeniedResourceHostnames,
} from "@webstudio-is/sdk/protected-resource-fetch";
import { createCloudflareManagedFormEmailSender, validateCloudflareManagedFormEmail } from "@webstudio-is/sdk/runtime";
export const validateManagedFormEmail = validateCloudflareManagedFormEmail;
export const createManagedFormEmailSender = ({ context, formData, projectId }: { context: unknown; formData: FormData; projectId: string }) => {
  const binding = (context as { cloudflare?: { env?: { EMAIL_SERVICE?: unknown } } } | null)?.cloudflare?.env?.EMAIL_SERVICE;
  const service = binding !== null && typeof binding === "object" && "fetch" in binding && typeof binding.fetch === "function"
    ? binding as { fetch: typeof fetch }
    : undefined;
  return createCloudflareManagedFormEmailSender(service, formData, projectId);
};
export const createManagedFormResourceFetch = ({ request, context, projectDomain }: { request: Request; context: unknown; projectDomain?: string }) => {
  void context;
  return createCloudflareProtectedResourceFetch({
    ownZoneHostnames: getDeniedResourceHostnames([
      new URL(request.url).hostname,
      projectDomain,
    ]) as [string, ...string[]],
  });
};
