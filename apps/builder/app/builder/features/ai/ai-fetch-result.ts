import { z } from "zod";
import {
  copywriter,
  operations,
  handleAiRequest,
  commandDetect,
} from "@webstudio-is/ai";
import { createRegularStyleSheet } from "@webstudio-is/css-engine";
import {
  generateJsxElement,
  generateJsxChildren,
  getIndexesWithinAncestors,
  getStyleRules,
  idAttribute,
  componentAttribute,
  type WsEmbedTemplate,
} from "@webstudio-is/react-sdk";
import { Instance, createScope, findTreeInstanceIds } from "@webstudio-is/sdk";
import { computed } from "nanostores";
import { getMapValuesByKeysSet } from "~/shared/array-utils";
import {
  $dataSources,
  $instances,
  $project,
  $props,
  $registeredComponentMetas,
  $selectedInstanceSelector,
  $styleSourceSelections,
  $styles,
} from "~/shared/nano-states";
import { applyOperations, patchTextInstance } from "./apply-operations";
import { restAi } from "~/shared/router-utils";
import untruncateJson from "untruncate-json";
import { RequestParamsSchema } from "~/routes/rest.ai._index";
import {
  AiApiException,
  RateLimitException,
  textToRateLimitMeta,
} from "./api-exceptions";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

const unknownArray = z.array(z.unknown());

const onResponseReceived = async (response: Response) => {
  if (response.ok === false) {
    const text = await response.text();

    if (response.status === 429) {
      const meta = textToRateLimitMeta(text);
      throw new RateLimitException(text, meta);
    }

    throw new Error(
      `Fetch error status="${response.status}" text="${text.slice(0, 1000)}"`
    );
  }
};

export const fetchResult = async (
  prompt: string,
  instanceId: Instance["id"],
  abortSignal: AbortSignal
): Promise<void> => {
  const commandsResponse = await handleAiRequest<commandDetect.Response>(
    fetch(restAi("detect"), {
      method: "POST",
      body: JSON.stringify({ prompt }),
      signal: abortSignal,
    }),
    {
      onResponseReceived,
    }
  );

  if (commandsResponse.type === "stream") {
    throw new Error(
      "Commands detection is not using streaming. Something went wrong."
    );
  }

  if (commandsResponse.success === false) {
    // Server error response
    throw new Error(commandsResponse.data.message);
  }

  const project = $project.get();

  const availableComponentsNames = $availableComponentsNames.get();
  const [styles, jsx] = $jsx.get() || ["", ""];

  const requestParams = {
    jsx: `${styles}${jsx}`,
    components: availableComponentsNames,
    projectId: project?.id,
    instanceId,
    prompt,
  };

  // @todo Future commands might not require all the requestParams above.
  // When that will be the case, we should revisit the validatin below.
  if (requestParams.instanceId === undefined) {
    throw new Error("Please select an instance on the canvas.");
  }

  // @todo can be covered by ts
  if (
    RequestParamsSchema.omit({ command: true }).safeParse(requestParams)
      .success === false
  ) {
    throw new Error("Invalid prompt data");
  }

  const appliedOperations = new Set<string>();

  const promises = await Promise.allSettled(
    commandsResponse.data.map((command) =>
      handleAiRequest<operations.Response>(
        fetch(restAi(), {
          method: "POST",
          body: JSON.stringify({
            ...requestParams,
            command,
            jsx:
              // Delete instances don't need CSS.
              command === operations.deleteInstanceName
                ? jsx
                : requestParams.jsx,
            // @todo This helps the operations chain disambiguating operation detection.
            // Ideally though the operations chain can be executed just for one
            // specific kind of operation i.e. `command`.
            prompt: `${command}:\n\n${requestParams.prompt}`,
          }),
          signal: abortSignal,
        }),
        {
          onResponseReceived,
          onChunk: (operationId, { completion }) => {
            if (operationId === "copywriter") {
              try {
                const unparsedDataArray = unknownArray.parse(
                  JSON.parse(untruncateJson(completion))
                );

                const parsedDataArray = unparsedDataArray
                  .map((item) => {
                    const safeResult =
                      copywriter.TextInstanceSchema.safeParse(item);
                    if (safeResult.success) {
                      return safeResult.data;
                    }
                  })
                  .filter(
                    <T>(value: T): value is NonNullable<T> =>
                      value !== undefined
                  );

                const operationsToApply = parsedDataArray.filter(
                  (item) =>
                    appliedOperations.has(JSON.stringify(item)) === false
                );

                for (const operation of operationsToApply) {
                  patchTextInstance(operation);
                  appliedOperations.add(JSON.stringify(operation));
                }
              } catch (error) {
                console.error(error);
              }
            }
          },
        }
      )
    )
  );

  for (const promise of promises) {
    if (promise.status === "fulfilled") {
      const result = promise.value;

      if (result.success === false) {
        throw new AiApiException(result.data.message);
      }

      if (result.type !== "json") {
        continue;
      }

      if (result.id === "operations") {
        restoreComponentsNamespace(result.data);
        applyOperations(result.data);
        continue;
      }
    } else if (promise.status === "rejected") {
      if (promise.reason instanceof Error) {
        throw promise.reason;
      }

      throw new Error(promise.reason.message);
    }
  }
};

const $availableComponentsNames = computed(
  [$registeredComponentMetas],
  (metas) => {
    const exclude = [
      "Body",
      "Slot",
      // @todo Remove Radix exclusion when the model has been fine-tuned to understand them.
      isFeatureEnabled("aiRadixComponents")
        ? "@webstudio-is/sdk-components-react-radix:"
        : undefined,
    ].filter(function <T>(value: T): value is NonNullable<T> {
      return value !== undefined;
    });

    return [...metas.keys()]
      .filter((name) => !exclude.some((excluded) => name.startsWith(excluded)))
      .map(parseComponentName);
  }
);

const traverseTemplate = (
  template: WsEmbedTemplate,
  fn: (node: WsEmbedTemplate[number]) => void
) => {
  for (const node of template) {
    fn(node);
    if (node.type === "instance") {
      traverseTemplate(node.children, fn);
    }
  }
};

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
    $selectedInstanceSelector,
    $instances,
    $props,
    $dataSources,
    $registeredComponentMetas,
    $styles,
    $styleSourceSelections,
  ],
  (
    selectedInstanceSelector,
    instances,
    props,
    dataSources,
    metas,
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
      usedDataSources: new Map(),
      indexesWithinAncestors,
      children: generateJsxChildren({
        scope,
        children: instance.children,
        instances,
        props,
        dataSources,
        usedDataSources: new Map(),
        indexesWithinAncestors,
        excludePlaceholders: true,
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

    const sheet = createRegularStyleSheet({ name: "ssr" });

    const styleRules = getStyleRules(styles, treeStyleSourceSelections);
    for (const { breakpointId, instanceId, state, style } of styleRules) {
      sheet.addStyleRule(
        { breakpoint: breakpointId, style },
        `[${idAttribute}="${instanceId}"]${state ?? ""}`
      );
    }

    const css = sheet.cssText.replace(/\n/gm, " ");
    return [
      css.length > 0 ? `<style>{\`${css}\`}</style>` : "",
      jsx
        .replace(new RegExp(`${componentAttribute}="[^"]+"`, "g"), "")
        .replace(/\n(data-)/g, " $1"),
    ];
  }
);
