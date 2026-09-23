import {
  customResponseHeaders,
  getResponseHeaders,
} from "@webstudio-is/sdk/schema";
import type { ProjectSettings } from "@webstudio-is/project-build";

export const generateResponseHeadersModule = (settings?: ProjectSettings) => {
  const headers = getResponseHeaders(
    customResponseHeaders.parse(settings?.meta.customHeaders ?? [])
  );
  return `// Generated response header configuration for hosting adapters.
export const customHeaders: Array<{ name: string; value: string | null }> = ${JSON.stringify(headers, null, 2)};
`;
};
