import {
  createCloudflareProtectedResourceFetch,
  getDeniedResourceHostnames,
} from "@webstudio-is/sdk/protected-resource-fetch";
import { createCloudflareManagedFormEmailSender, createCloudflareManagedFormEmailSenderWithUrl, validateCloudflareManagedFormEmail } from "@webstudio-is/sdk/runtime";
export const validateManagedFormEmail = validateCloudflareManagedFormEmail;
export const createManagedFormEmailSender = ({ context, formData, projectId }: { context: unknown; formData: FormData; projectId: string }) => {
  const env = (context as { cloudflare?: { env?: { EMAIL_SERVICE?: unknown; EMAIL_SERVICE_URL?: string; EMAIL_SERVICE_TOKEN?: string } } } | null)?.cloudflare?.env;
  if (env?.EMAIL_SERVICE_URL !== undefined || env?.EMAIL_SERVICE_TOKEN !== undefined) {
    return createCloudflareManagedFormEmailSenderWithUrl(env.EMAIL_SERVICE_URL, env.EMAIL_SERVICE_TOKEN, formData, projectId);
  }
  const binding = env?.EMAIL_SERVICE;
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
