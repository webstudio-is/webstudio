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
  if (isFeatureEnabled("aiCopy") === false) {
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

  const { projectId, prompt, textInstances } = parsed.data;

  // Permissions check
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
  // End of Permissions check

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
