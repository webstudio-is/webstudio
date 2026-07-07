import { apiClientHeader } from "@webstudio-is/trpc-interface/api-compatibility";

export const isCliApiRequest = (request: Pick<Request, "headers">) => {
  return request.headers.get(apiClientHeader) === "cli";
};
