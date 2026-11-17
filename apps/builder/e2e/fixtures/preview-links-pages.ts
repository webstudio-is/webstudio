import {
  hasHistoricalFormComponentIdentityVersion,
  serializedPages,
} from "@webstudio-is/project-migrations/pages";
import { z } from "zod";

export const parsePreviewLinksPages = (value: unknown) => ({
  ...serializedPages.parse(value),
  ...(hasHistoricalFormComponentIdentityVersion(value)
    ? z.object({ formComponentIdentityVersion: z.number().int() }).parse(value)
    : {}),
});
