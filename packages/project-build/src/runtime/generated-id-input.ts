import { z } from "zod";
import { runtimeGeneratedIdInputDescription } from "../contracts/input-schema";

export const runtimeGeneratedIdInput = z
  .custom<undefined>((value) => value === undefined, {
    message:
      "Client-supplied ids are not allowed when creating records. Omit the id and use the id returned by Webstudio.",
  })
  .optional()
  .describe(runtimeGeneratedIdInputDescription);
