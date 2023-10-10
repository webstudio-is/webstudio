// import { restAi } from "~/shared/router-utils";

import { z } from "zod";
import {
  copywriter,
  type operations,
  handleAiRequest,
  commandDetect,
} from "@webstudio-is/ai";
import { createCssEngine } from "@webstudio-is/css-engine";
import {
  generateJsxElement,
  generateJsxChildren,
  getIndexesWithinAncestors,
  getStyleRules,
  idAttribute,
  componentAttribute,
} from "@webstudio-is/react-sdk";
import { createScope, findTreeInstanceIds } from "@webstudio-is/sdk";
import { computed } from "nanostores";
import { getMapValuesByKeysSet } from "~/shared/array-utils";
import {
  breakpointsStore,
  dataSourcesStore,
  instancesStore,
  projectStore,
  propsStore,
  registeredComponentMetasStore,
  selectedInstanceSelectorStore,
  styleSourceSelectionsStore,
  stylesStore,
} from "~/shared/nano-states";
import { applyOperations, patchTextInstance } from "./apply-operations";
import { restAi } from "~/shared/router-utils";
import { RequestParamsSchema } from "~/routes/rest.ai";
import untruncateJson from "untruncate-json";
import { traverseTemplate } from "@webstudio-is/jsx-utils";

export const fetchResult = async (
  prompt: string,
  abortSignal: AbortSignal
): Promise<void> => {
  const project = projectStore.get();
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  const availableComponentsNames = $availableComponentsNames.get();
  const jsx = $jsx.get();

  const requestParams = {
    jsx: jsx ? JSON.stringify(jsx) : "",
    components: availableComponentsNames,
    projectId: project?.id,
    instanceId: selectedInstanceSelector?.[0] ?? "",
    prompt,
  };

  if (
    RequestParamsSchema.omit({ command: true }).safeParse(requestParams)
      .success === false
  ) {
    throw new Error("Invalid prompt data");
  }

  const commandsResponse = await handleAiRequest<commandDetect.Response>(
    fetch(restAi("detect"), {
      method: "POST",
      body: JSON.stringify({ prompt: requestParams.prompt }),
      signal: abortSignal,
    }),
    { signal: abortSignal }
  );

  if (
    commandsResponse.success === false ||
    commandsResponse.type === "stream"
  ) {
    // Commands detection is not using streaming
    // therefore this should never be the case.
    // The check is here just for type safety.
    if (commandsResponse.type === "stream") {
      // eslint-disable-next-line no-console
      throw new Error("Something went wrong.");
    }

    if (abortSignal.aborted === false) {
      throw new Error(commandsResponse.data.message);
    }

    throw new Error("Unknown error");
  }

  const promises = await Promise.allSettled(
    commandsResponse.data.map((command) =>
      handleAiRequest<operations.Response>(
        fetch(restAi(), {
          method: "POST",
          body: JSON.stringify({ ...requestParams, command }),
          signal: abortSignal,
        }),
        {
          signal: abortSignal,
          onChunk: (operationId, { completion }) => {
            if (operationId === "copywriter") {
              try {
                const jsonResponse = z
                  .array(copywriter.TextInstanceSchema)
                  .parse(JSON.parse(untruncateJson(completion)));

                const currenTextInstance = jsonResponse.pop();

                if (currenTextInstance === undefined) {
                  return;
                }

                patchTextInstance(currenTextInstance);
              } catch {
                /**/
              }
            }
          },
        }
      )
    )
  );

  const errors = [];

  for (const promise of promises) {
    if (promise.status === "fulfilled") {
      const result = promise.value;

      if (result.success === false) {
        errors.push(result.data.message);
        continue;
      }

      if (result.type !== "json") {
        continue;
      }

      if (result.id === "operations") {
        restoreComponentsNamespace(result.data);
        applyOperations(result.data);
        continue;
      }

      // Handle other commands responses below.
      // ...
      //
    } else if (promise.status === "rejected") {
      errors.push(promise.reason);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
};

const $availableComponentsNames = computed(
  [registeredComponentMetasStore],
  (metas) => {
    const exclude = ["Body", "Slot"];

    return [...metas.keys()]
      .filter((name) => !exclude.includes(name))
      .map(parseComponentName);
  }
);

// The LLM gets a list of available component names
// therefore we need to replace the component namespace with a LLM-friendly one
// preserving context eg. Radix.Dialog instead of just Dialog
const parseComponentName = (name: string) =>
  name.replace("@webstudio-is/sdk-components-react-radix:", "Radix.");
// When AI generation is done we need to restore components namespaces.
const restoreComponentsNamespace = (operations: operations.WsOperations) => {
  for (const operation of operations) {
    if (operation.operation === "insertTemplate") {
      traverseTemplate(operation.template, (node) => {
        if (node.type === "instance" && node.component.startsWith("Radix.")) {
          node.component =
            "@webstudio-is/sdk-components-react-radix:" +
            node.component.slice("Radix.".length);
        }
      });
    }
  }
};

const $jsx = computed(
  [
    selectedInstanceSelectorStore,
    instancesStore,
    propsStore,
    dataSourcesStore,
    registeredComponentMetasStore,
    breakpointsStore,
    stylesStore,
    styleSourceSelectionsStore,
  ],
  (
    selectedInstanceSelector,
    instances,
    props,
    dataSources,
    metas,
    breakpoints,
    styles,
    styleSourceSelections
  ) => {
    if (selectedInstanceSelector === undefined) {
      return;
    }

    const [rootInstanceId] = selectedInstanceSelector;
    const instance = instances.get(rootInstanceId);
    if (instance === undefined) {
      return;
    }
    const indexesWithinAncestors = getIndexesWithinAncestors(metas, instances, [
      rootInstanceId,
    ]);
    const scope = createScope();

    const jsx = generateJsxElement({
      scope,
      instance,
      props,
      dataSources,
      indexesWithinAncestors,
      children: generateJsxChildren({
        scope,
        children: instance.children,
        instances,
        props,
        dataSources,
        indexesWithinAncestors,
      }),
    });

    const treeInstanceIds = findTreeInstanceIds(instances, rootInstanceId);

    const treeStyleSourceSelections = new Map(
      getMapValuesByKeysSet(styleSourceSelections, treeInstanceIds).map(
        (styleSourceSelection) => [
          styleSourceSelection.instanceId,
          styleSourceSelection,
        ]
      )
    );

    const engine = createCssEngine({ name: "ssr" });

    const styleRules = getStyleRules(styles, treeStyleSourceSelections);
    for (const { breakpointId, instanceId, state, style } of styleRules) {
      engine.addStyleRule(`[${idAttribute}="${instanceId}"]${state ?? ""}`, {
        breakpoint: breakpointId,
        style,
      });
    }

    return `<style>{\`${engine.cssText.replace(/\n/gm, " ")}\`}</style>${jsx
      .replace(new RegExp(`${componentAttribute}="[^"]+"`, "g"), "")
      .replace(/\n(data-)/g, " $1")}`;
  }
);

/*
export const fetchResult = async (text: string) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${restAi()}/blabla`, {
    method: "POST",
    body: formData,
  });

  if (response.ok === false) {
    // @todo: show error
    return;
  }

  // @todo add response parsing
  const { text } = await response.json();

  // return text;
  await new Promise((resolve) => setTimeout(resolve, 10000));
};
*/
