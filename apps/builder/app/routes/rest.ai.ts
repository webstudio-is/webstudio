import type { ActionArgs } from "@remix-run/node";
import {
  createEditTweakChain,
  createGenerateDesignSystemEnhanceChain,
  createGenerateDesignSystemPageChain,
  createGenerateDesignSystemThemeChain,
  createGenerateFullComponentsChain,
  createGenerateFullExpandChain,
  createGenerateFullScreenChain,
  createGenerateFullThemeChain,
  createGenerateInstancesChain,
  createGenerateStylesChain,
  createGptModel,
  type ChainContext,
  type GPTModelMessageFormat,
} from "@webstudio-is/ai";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { prisma } from "@webstudio-is/prisma-client";
import {
  loadBuildByProjectId,
  parseBuild,
} from "@webstudio-is/project-build/index.server";
import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";
import { z } from "zod";
import { zfd } from "zod-form-data";
import env from "~/env/env.server";
import { createContext } from "~/shared/context.server";

const StepSchema = z.enum(["instances", "styles"]);
type StepName = z.infer<typeof StepSchema>;

const RequestSchema = zfd.formData(
  z.intersection(
    z.object({
      prompt: zfd.text(z.string().max(3380)),
      screenPrompt: zfd.text(z.string().max(1380).optional()).optional(),
      components: zfd.text(z.string().optional()).optional(),
      componentsStyles: zfd.text(z.string().optional()).optional(),
      theme: zfd.text(z.string().optional()).optional(),
      messages: zfd.repeatableOfType(zfd.text()).optional(),
      instanceId: zfd.text(),
      projectId: zfd.text(),
      buildId: zfd.text().optional(),
    }),
    z.union([
      z.object({
        _action: zfd.text(z.enum(["generate"])),
        steps: zfd.repeatableOfType(
          z.enum(["expand", "theme", "components", "screen", "page", "enhance"])
        ),
      }),
      // z.object({
      //   _action: zfd.text(z.enum(["generate"])),
      //   steps: zfd.repeatableOfType(z.enum(["instances", "styles"])),
      // }),
      z.object({
        _action: zfd.text(z.enum(["edit"])),
        steps: zfd.repeatableOfType(z.enum(["tweak"])),
      }),
    ])
  )
);
type RequestSchema = z.infer<typeof RequestSchema>;

const chains = {
  generate: {
    // full: createGenerateFullChain<GPTModelMessageFormat>(),
    instances: createGenerateInstancesChain<GPTModelMessageFormat>(),
    styles: createGenerateStylesChain<GPTModelMessageFormat>(),
    page: createGenerateDesignSystemPageChain<GPTModelMessageFormat>(),
    theme: createGenerateDesignSystemThemeChain<GPTModelMessageFormat>(),
    enhance: createGenerateDesignSystemEnhanceChain<GPTModelMessageFormat>(),
  },
  edit: {
    tweak: createEditTweakChain<GPTModelMessageFormat>(),
  },
  full: {
    expand: createGenerateFullExpandChain<GPTModelMessageFormat>(),
    theme: createGenerateFullThemeChain<GPTModelMessageFormat>(),
    components: createGenerateFullComponentsChain<GPTModelMessageFormat>(),
    screen: createGenerateFullScreenChain<GPTModelMessageFormat>(),
  },
};

export const action = async ({ request }: ActionArgs) => {
  if (!isFeatureEnabled("ai")) {
    return { errors: ["Feature not available"] };
  }

  if (!env.OPENAI_KEY) {
    throw new Error("Invalid OpenAI Key");
  }

  if (!env.OPENAI_ORG || !env.OPENAI_ORG.startsWith("org-")) {
    throw new Error("Invalid OpenAI Org");
  }

  const formData = RequestSchema.parse(await request.formData());

  /* Permissions check */
  const requestContext = await createContext(request);
  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId: formData.projectId, permit: "edit" },
    requestContext
  );
  if (canEdit === false) {
    throw Error("You don't have edit access to this project");
  }
  /* End of Permissions check */

  // @todo 1. Revisit this because technically every Chain could use a different Model
  const context: ChainContext = {
    api: {
      getBuild: async function getBuild({ projectId, buildId }) {
        let build;

        if (buildId) {
          const dbResult = await prisma.build.findUnique({
            where: { id_projectId: { projectId, id: buildId } },
          });

          if (!dbResult) {
            throw new Error("Build not found");
          }

          build = parseBuild(dbResult);
        } else {
          build = await loadBuildByProjectId(projectId);
        }

        if (!build) {
          throw new Error("Build not found");
        }

        return build;
      },
    },
    prompts: {
      request: formData.prompt,
      screenPrompt: formData.screenPrompt || "",
      components: formData.components || "",
      componentsStyles: formData.componentsStyles || "",
      theme: formData.theme || "",
    },
    messages: (formData.messages || []).map((message) => JSON.parse(message)),
    projectId: formData.projectId,
    buildId: formData.buildId,
    instanceId: formData.instanceId,
  };

  const responses = [];
  const action = formData._action;

  for (const step of formData.steps) {
    // @todo Remove this hard coded if/else see @todo 1.
    let chain = null;

    switch (action) {
      case "generate":
        // if (
        //   step === "expand" ||
        //   step === "theme" ||
        //   step === "components" ||
        //   step === "screen"
        // ) {
        //   chain = chains.full[step];
        // }
        if (step === "theme" || step === "page" || step === "enhance") {
          chain = chains.generate[step];
        }
        break;
    }

    // const chain = action;
    // action === "generate"
    //   ? step === "instances" || step === "styles"
    //     ? chains[action][step]
    //     : null
    //   : action === "edit" && step === "tweak"
    //   ? chains[action][step]
    //   : null;

    if (typeof chain !== "function") {
      throw new Error(`Invalid step ${step}`);
    }

    const model = createGptModel({
      apiKey: env.OPENAI_KEY,
      organization: env.OPENAI_ORG,
      temperature: step === "theme" ? 1 : 0.5,
      model: step === "components" ? "gpt-3.5-turbo-16k" : "gpt-3.5-turbo", //step !== "screen" ? "gpt-3.5-turbo" : "gpt-3.5-turbo-16k",
      // model: "gpt-4",
    });

    const chainResponse = await chain({ model, context });

    responses.push([
      step,
      { json: chainResponse.json[0], code: chainResponse.code[0] },
    ]);
  }

  return responses;
};
