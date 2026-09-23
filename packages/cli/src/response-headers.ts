import { customResponseHeaders } from "@webstudio-is/sdk/schema";
import type { ProjectSettings } from "@webstudio-is/project-build";
import { createHash } from "node:crypto";

export const generateResponseHeadersModule = (
  settings?: ProjectSettings,
  deploymentId = ""
) => {
  const headers = customResponseHeaders.parse(
    settings?.meta.customHeaders ?? []
  );
  // Cache entries contain the final response headers. Isolate each deployment
  // and configuration so deleted overrides cannot survive a republish.
  const revision = createHash("sha256")
    .update(JSON.stringify([deploymentId, headers]))
    .digest("hex");
  return `// Generated response header configuration for hosting adapters.
export const customHeaders: Array<{ name: string; value: string | null }> = ${JSON.stringify(headers, null, 2)};
export const responseHeadersCacheName = "file-cache-headers-${revision}";
`;
};
