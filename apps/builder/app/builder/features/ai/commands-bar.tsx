import { z } from "zod";
import { copywriter, type operations, handleAiRequest } from "@webstudio-is/ai";
import { createCssEngine } from "@webstudio-is/css-engine";
import { Button, InputField, Label, Text } from "@webstudio-is/design-system";
import { SpinnerIcon } from "@webstudio-is/icons";
import {
  generateJsxElement,
  generateJsxChildren,
  getIndexesWithinAncestors,
  getStyleRules,
  idAttribute,
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
) => {
  const requestParams = Object.fromEntries(new FormData(event.currentTarget));

  requestParams.components =
    typeof requestParams.components === "string"
      ? JSON.parse(requestParams.components)
      : undefined;

  if (RequestParamsSchema.safeParse(requestParams).success === false) {
    throw new Error("Invalid prompt data");
  }

  const result = await handleAiRequest<operations.Response>(
    fetch(restAi(), {
      method: "POST",
      body: JSON.stringify(requestParams),
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
  );

  if (result.success === true) {
    if (result.type === "json" && result.id === "operations") {
      restoreComponentsNamespace(result.data);
      applyOperations(result.data);
    }
    return;
  }

  if (abortSignal.aborted === false) {
    throw new Error(result.data.message);
  }
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
          await handleSubmit(event, abort.current.signal);
        } catch (error) {
          setError(
            error instanceof Error ? error.message : "Something went wrong."
          );
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
      .replace(new RegExp(`${idAttribute}="[^"]+"`, "g"), "")
      .replace(/\n(data-)/g, " $1")}`;
  }
);
