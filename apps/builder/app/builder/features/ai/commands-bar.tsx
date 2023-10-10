import { z } from "zod";
import {
  copywriter,
  type operations,
  handleAiRequest,
  commandDetect,
} from "@webstudio-is/ai";
import { createCssEngine } from "@webstudio-is/css-engine";
import { Button, InputField, Label, Text } from "@webstudio-is/design-system";
import { SpinnerIcon } from "@webstudio-is/icons";
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
import { useRef, useState } from "react";
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
import { useStore } from "@nanostores/react";
import { restAi } from "~/shared/router-utils";
import { RequestParamsSchema } from "~/routes/rest.ai";
import untruncateJson from "untruncate-json";
import { traverseTemplate } from "@webstudio-is/jsx-utils";

const handleSubmit = async (
  event: React.FormEvent<HTMLFormElement>,
  abortSignal: AbortSignal
): Promise<string[]> => {
  const requestParams = Object.fromEntries(new FormData(event.currentTarget));

  requestParams.components =
    typeof requestParams.components === "string"
      ? JSON.parse(requestParams.components)
      : undefined;

  if (
    RequestParamsSchema.omit({ command: true }).safeParse(requestParams)
      .success === false
  ) {
    return ["Invalid prompt data"];
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
      return ["Something went wrong."];
    }

    if (abortSignal.aborted === false) {
      return [commandsResponse.data.message];
    }

    return [];
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

  return errors;
};

export const CommandsBar = () => {
  const abort = useRef<AbortController>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const project = useStore(projectStore);
  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const availableComponentsNames = useStore($availableComponentsNames);
  const jsx = useStore($jsx);

  return (
    <form
      method="POST"
      action={restAi()}
      onSubmit={async (event) => {
        event.preventDefault();

        if (isLoading) {
          return;
        }
        abort.current = new AbortController();

        setError(undefined);
        setIsLoading(true);

        try {
          const errors = await handleSubmit(event, abort.current.signal);
          if (errors.length > 0) {
            setError(errors.join("\n"));
          }
        } catch (error) {
          setError("Something went wrong.");
        }

        abort.current = undefined;
        setIsLoading(false);
      }}
    >
      <Label>
        Prompt
        <InputField name="prompt" />
      </Label>
      <input type="hidden" name="jsx" value={jsx ? JSON.stringify(jsx) : ""} />
      <input
        type="hidden"
        name="components"
        value={JSON.stringify(availableComponentsNames)}
      />
      <input type="hidden" name="projectId" value={project?.id ?? ""} />
      <input
        type="hidden"
        name="instanceId"
        value={selectedInstanceSelector ? selectedInstanceSelector[0] : ""}
      />
      <input type="hidden" name="command" value="" />
      <Button
        onClick={(event) => {
          if (isLoading) {
            event.preventDefault();
            abort.current?.abort();
          }
        }}
      >
        {isLoading ? "stop" : "go"}
      </Button>{" "}
      {isLoading ? <SpinnerIcon /> : null}
      {error ? <Text>{error}</Text> : null}
    </form>
  );
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
