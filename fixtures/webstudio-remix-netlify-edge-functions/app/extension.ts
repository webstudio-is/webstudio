// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { AppLoadContext } from "@remix-run/server-runtime";
import { ResourceRequest } from "@webstudio-is/sdk";

declare module "@remix-run/server-runtime" {
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
