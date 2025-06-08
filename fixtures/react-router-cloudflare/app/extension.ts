import { ResourceRequest } from "@webstudio-is/sdk";

declare module "react-router" {
  interface AppLoadContext {
    EXCLUDE_FROM_SEARCH: boolean;
    getDefaultActionResource?: (options: {
      url: URL;
      projectId: string;
      contactEmail: string;
      formData: FormData;
    }) => ResourceRequest;
  }
}
