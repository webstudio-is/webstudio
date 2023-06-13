import { parseCssDecl } from "@webstudio-is/css-data";
import type { Build } from "@webstudio-is/project-build";
import {
  WsEmbedTemplate,
  type EmbedTemplateInstance,
} from "@webstudio-is/react-sdk";
import vm from "node:vm";
import type { Model as BaseModel } from "../../../models/types";
import { findById } from "../../../utils/find-by-id";
import { formatPrompt } from "../../../utils/format-prompt";
import { getCode } from "../../../utils/get-code";
import { getPalette } from "../../../utils/get-palette";
import { type Chain, type ChainMessage, type ElementType } from "../../types";
import { prompt as promptTemplate } from "./__generated__/tweak.prompt";
import { examples, wrapExample } from "./examples";

export const create = <ModelMessageFormat>(): Chain<
  BaseModel<ModelMessageFormat>
> =>
  async function chain({ model, context }) {
    const { prompts, messages, api, projectId, buildId, instanceId } = context;

    const build = await api.getBuild({ projectId, buildId });

    type InstanceType = ElementType<typeof build.instances>[1];
    const rootInstance = findById<InstanceType>(build.instances, instanceId);

    if (rootInstance === undefined) {
      throw new Error("Instance does not exist");
    }

    const template = toTeamplate({ build, instanceId });

    console.log({ template });

    // Prepare prompt variables...
    if (prompts.components) {
      prompts.components = JSON.parse(prompts.components)
        .map((name: string) => `| "${name}"`)
        .join("\n");
    }

    prompts.selectedInstance =
      rootInstance.component === "Body"
        ? ""
        : `- The root instance's componens it \`${rootInstance.component}\``;

    const { palette, colorMode } = getPalette(
      build.styles.map(([name, value]) => value)
    );

    prompts.palette = palette.join(", ") || `come up with an awesome one!`;
    prompts.colorMode = colorMode;

    const userMessage: ChainMessage = [
      "user",
      formatPrompt(prompts, promptTemplate),
    ];

    // console.log({ userMessage });

    const examplesMessages: ChainMessage[] = [
      ["user", "Here are some examples:"],
    ];

    Object.entries(examples).forEach(([user, assistant]) => {
      examplesMessages.push(["user", user]);
      examplesMessages.push(["assistant", wrapExample(assistant)]);
    });

    const requestMessages = model.generateMessages([
      ...messages,
      ...examplesMessages,
      userMessage,
    ]);

    const response = await model.request({
      messages: requestMessages,
    });

    // eslint-disable-next-line no-console
    console.log({ response });
    const fn = getCode(response, "javascript");

    const sandbox = {
      instance: template[0],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parseStyle: function parseStyle(style: { property: any; value: string }) {
        const parsedCss = parseCssDecl(style.property, style.value);
        return Object.entries(parsedCss).map(([property, value]) => ({
          property,
          value,
        }));
      },
      import: () => {
        throw new Error("not supported");
      },
      require: () => {
        throw new Error("not supported");
      },
    };

    const script = new vm.Script(`(${fn})(instance, parseStyle)`);
    const ctx = vm.createContext(sandbox);
    const json = [script.runInContext(ctx)];

    try {
      // validate the modified template
      WsEmbedTemplate.parse(json);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error(error);
      }
      throw new Error("Invalid tweak generation");
    }

    return {
      llmMessages: [[...messages, ["assistant", response]]],
      code: [process.env.NODE_ENV !== "production" ? fn : ""],
      json: [json],
    };
  };

const toTeamplate = function toTeamplate({
  build,
  instanceId,
}: {
  build: Build;
  instanceId: string;
}): WsEmbedTemplate {
  type InstanceType = ElementType<typeof build.instances>[1];
  type StylesSourceSelectionsType = ElementType<
    typeof build.styleSourceSelections
  >[1];
  type StylesSourcesType = ElementType<typeof build.styleSources>[1];

  const rootInstance = findById<InstanceType>(build.instances, instanceId);

  if (!rootInstance) {
    throw new Error("Instance not found");
  }

  const processInstances = function processInstances(
    instance: typeof rootInstance,
    template: WsEmbedTemplate
  ) {
    const { type, component, label } = instance;
    const templateInstance: EmbedTemplateInstance = {
      type,
      component,
      label,
      children: [],
      styles: [],
    };

    const styleSourcesSelection = findById<StylesSourceSelectionsType>(
      build.styleSourceSelections,
      instance.id
    );

    if (styleSourcesSelection) {
      const styleSources = styleSourcesSelection.values.map((styleSourceId) =>
        findById<StylesSourcesType>(build.styleSources, styleSourceId)
      );

      const styles = styleSources
        .flatMap((styleSource) =>
          styleSource
            ? build.styles.filter(
                ([_, { styleSourceId }]) => styleSourceId === styleSource.id
              )
            : []
        )
        .map(([id, { state, value, property }]) => ({
          state,
          property,
          value,
        }));

      templateInstance.styles = styles;
    }

    templateInstance.props = build.props
      .filter(
        ([id, prop]) =>
          prop.instanceId === instanceId &&
          false === ["asset", "page"].includes(prop.type)
      )
      .map(([id, { type, name, value }]) => ({ type, name, value }));

    templateInstance.children = instance.children.flatMap((child) => {
      if (child.type === "text") {
        return child;
      }
      const instanceId = child.value;
      const childInstance = findById(build.instances, instanceId);
      return childInstance ? processInstances(childInstance, []) : [];
    });

    template.push(templateInstance);

    return template;
  };

  return processInstances(rootInstance, []);
};
