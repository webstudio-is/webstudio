import type { EntryContext } from "@remix-run/node";
import * as Sentry from "@sentry/remix";
import { initSentry } from "@webstudio-is/remix";
import { prisma } from "@webstudio-is/prisma-client";
import { handleRequest } from "./shared/remix";

initSentry({
  integrations: [new Sentry.Integrations.Prisma({ client: prisma })],
});

export default handleRequest;
