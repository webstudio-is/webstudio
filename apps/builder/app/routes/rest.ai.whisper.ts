import type { ActionArgs } from "@remix-run/node";
import {
  copywriter,
  createGptModel,
  createWhisperModel,
} from "@webstudio-is/ai";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { z } from "zod";
import env from "~/env/env.server";

//const RequestSchema = copywriter.ContextSchema.extend({
//  projectId: z.string(),
//  audio: z.string(),
//});

const RequestSchema = z.object({
  projectId: z.string(),
  audio: z.string(),
});

export const action = async function action({ request }: ActionArgs) {
  if (isFeatureEnabled("aiWhisper") === false) {
    return {
      success: false,
      type: "featureDisabled",
      status: 503,
      message: "The feature is not available",
    };
  }

  if (env.OPENAI_KEY === undefined) {
    return {
      success: false,
      type: "invalidApiKey",
      status: 401,
      message: "",
    };
  }

  if (
    env.OPENAI_ORG === undefined ||
    env.OPENAI_ORG.startsWith("org-") === false
  ) {
    return {
      success: false,
      type: "invalidOrg",
      status: 401,
      message: "",
    };
  }

  const parsed = RequestSchema.safeParse(await request.json());

  if (parsed.success === false) {
    return {
      success: false,
      type: "invalidRequest",
      status: 400,
      message:
        process.env.NODE_ENV === "development"
          ? parsed.error.errors
          : "Invalid request data",
    };
  }

  // @todo add rate limiting

  const { audio } = parsed.data;

  const model = createWhisperModel({
    apiKey: env.OPENAI_KEY,
    organization: env.OPENAI_ORG,
    temperature: 0.5,
  });

  return model.request({ audio });
};
