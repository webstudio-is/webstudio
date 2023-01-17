import type { EntryContext } from "@remix-run/node";
import * as Sentry from "@sentry/remix";
import {
  initSentry,
  handleRequest as handleRequestDesigner,
} from "@webstudio-is/remix";
import { prisma } from "@webstudio-is/prisma-client";
import { handleRequest as handleRequestCanvas } from "@webstudio-is/react-sdk";
import { getBuildParams } from "./shared/build-utils";

initSentry({
  integrations: [new Sentry.Integrations.Prisma({ client: prisma })],
});

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  let handle = handleRequestDesigner;

  if (
    remixContext.matches.some(
      (match) =>
        match.route.id === "routes/$" || match.route.id === "routes/index"
    ) &&
    getBuildParams(request) !== undefined
  ) {
    handle = handleRequestCanvas;
  }

  return handle(request, responseStatusCode, responseHeaders, remixContext);
}
