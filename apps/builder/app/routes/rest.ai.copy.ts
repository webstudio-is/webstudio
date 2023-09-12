import type { ActionArgs } from "@remix-run/node";
import {
  copywriter,
  createGptModel,
  type GPTModelMessageFormat,
} from "@webstudio-is/ai";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";
import { z } from "zod";
import env from "~/env/env.server";
import { createContext } from "~/shared/context.server";

const RequestSchema = copywriter.ContextSchema.extend({
  projectId: z.string(),
});

export const action = async function action({ request }: ActionArgs) {
  if (!isFeatureEnabled("aiCopy")) {
    return {
      success: false,
      type: "feature_disabled",
      status: 503,
      message: "The feature is not available",
    };
  }

  if (!env.OPENAI_KEY) {
    return {
      success: false,
      type: "invalid_apiKey",
      status: 401,
      message: "",
    };
  }

  if (!env.OPENAI_ORG || !env.OPENAI_ORG.startsWith("org-")) {
    return {
      success: false,
      type: "invalid_org",
      status: 401,
      message: "",
    };
  }

  const parsed = RequestSchema.safeParse(await request.json());

  if (parsed.success === false) {
    return {
      success: false,
      type: "invalid_request",
      status: 400,
      message:
        process.env.NODE_ENV === "development"
          ? parsed.error.errors
          : "Invalid request data",
    };
  }

  const { projectId, prompt, textInstances } = parsed.data;

  /* Permissions check */
  const requestContext = await createContext(request);
  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId: projectId, permit: "edit" },
    requestContext
  );
  if (canEdit === false) {
    return {
      success: false,
      type: "unauthorized",
      status: 401,
      message: "You don't have edit access to this project",
    };
  }
  /* End of Permissions check */

  // @todo add rate limiting

  const model = createGptModel({
    apiKey: env.OPENAI_KEY,
    organization: env.OPENAI_ORG,
    temperature: 0.5,
    model: "gpt-3.5-turbo",
  });

  const chain = copywriter.createChain<GPTModelMessageFormat>();

  return chain({
    model,
    context: {
      prompt,
      textInstances,
    },
  });
};
