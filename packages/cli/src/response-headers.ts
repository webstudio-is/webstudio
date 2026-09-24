import {
  customResponseHeaders,
  getResponseHeaderDefinition,
  getResponseHeaders,
} from "@webstudio-is/sdk/schema";
import type { ProjectSettings } from "@webstudio-is/project-build";

export const generateResponseHeadersModule = (settings?: ProjectSettings) => {
  const configured = customResponseHeaders.parse(
    settings?.meta.customHeaders ?? []
  );
  const headers = [
    ...getResponseHeaders(configured).map((header) => ({
      route: "/*",
      ...header,
    })),
    ...configured.filter(
      (header) =>
        getResponseHeaderDefinition(header.name) === undefined ||
        (header.route !== undefined && header.route !== "/*")
    ),
  ];
  return `// Generated response header configuration for hosting adapters.
export const customHeaders: Array<{ route?: string; name: string; value: string | null }> = ${JSON.stringify(headers, null, 2)};
`;
};
