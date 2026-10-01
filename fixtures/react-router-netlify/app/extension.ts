import type { ResourceRequest } from "@webstudio-is/sdk";

declare module "react-router" {
  interface AppLoadContext {
    EXCLUDE_FROM_SEARCH: boolean;
    /** Client IP resolved by a trusted server adapter, not a raw request header. */
    clientAddress?: string;
    WEBSTUDIO_AUTOMATION_TOKEN?: string;
    getDefaultActionResource?: (options: {
      url: URL;
      projectId: string;
      contactEmail: string;
      formData: FormData;
    }) => ResourceRequest;
  }
}
