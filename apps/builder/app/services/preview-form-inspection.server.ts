import type { ResourceExchange } from "@webstudio-is/sdk/runtime";
import { capturePreviewResourceExchange } from "./preview-resource-inspection.server";

/** Form Email subjects include a generated submission reference. */
export const capturePreviewFormExchange = (
  resourceId: string,
  exchange: ResourceExchange,
  options: Parameters<typeof capturePreviewResourceExchange>[2]
) => {
  const request = exchange.request;
  const subject =
    request instanceof Request || request.control !== "email"
      ? undefined
      : request.email?.subject;
  const publicValueAliases =
    subject &&
    options.publicValues.has(subject.replace(/ \[[a-f0-9]{16}\]$/, ""))
      ? new Set([subject])
      : new Set<string>();
  return capturePreviewResourceExchange(resourceId, exchange, {
    ...options,
    publicValueAliases,
  });
};
