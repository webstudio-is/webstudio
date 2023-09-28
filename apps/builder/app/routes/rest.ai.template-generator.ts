import type { ActionArgs } from "@remix-run/node";
import {
  templateGenerator,
  createGptModel,
  type GPTModelMessageFormat,
} from "@webstudio-is/ai";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

import env from "~/env/env.server";
import { createContext } from "~/shared/context.server";

const RequestSchema = templateGenerator.ContextSchema;

export const action = async function action({ request }: ActionArgs) {
  if (isFeatureEnabled("aiTemplateGenerator") === false) {
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

  const { prompt, components } = parsed.data;

  const requestContext = await createContext(request);

  if (requestContext.authorization.userId === undefined) {
    return {
      success: false,
      type: "unauthorized",
      status: 401,
      message: "You don't have edit access to this project",
    };
  }

  // @todo add rate limiting

  const model = createGptModel({
    apiKey: env.OPENAI_KEY,
    organization: env.OPENAI_ORG,
    temperature: 0.5,
    model: "gpt-4",
  });

  const chain = templateGenerator.createChain<GPTModelMessageFormat>();

  const response = await chain({
    model,
    context: {
      prompt,
      components,
    },
  });

  if (response.success === false) {
    return response;
  }

  return {
    success: true,
    data: response.data,
  };
};
