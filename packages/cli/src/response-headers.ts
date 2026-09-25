import { customResponseHeaders } from "@webstudio-is/sdk/schema";
import type { ProjectSettings } from "@webstudio-is/project-build";

export const generateResponseHeadersModule = (settings?: ProjectSettings) => {
  const configured = customResponseHeaders.parse(
    settings?.meta.customHeaders ?? []
  );
  return `// Generated response header configuration for hosting adapters.
export const customHeaders: Array<{ route?: string; name: string; value: string }> = ${JSON.stringify(
    configured,
    null,
    2
  )};
`;
};
