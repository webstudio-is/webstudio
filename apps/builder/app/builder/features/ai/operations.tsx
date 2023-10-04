import { operations, request } from "@webstudio-is/ai";
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
  propsStore,
  registeredComponentMetasStore,
  selectedInstanceSelectorStore,
  styleSourceSelectionsStore,
  stylesStore,
} from "~/shared/nano-states";
import { applyOperations } from "./apply-operations";
import { useStore } from "@nanostores/react";
import { restAiOperations } from "~/shared/router-utils";

export const Operations = () => {
  const abort = useRef<AbortController>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const jsx = useStore($jsx);

  return (
    <form
      method="POST"
      action=""
      onSubmit={(event) => {
        event.preventDefault();

        if (isLoading) {
          return;
        }

        const formData = new FormData(event.currentTarget);

        const prompt = formData.get("prompt");
        let data = formData.get("data");

        if (typeof data === "string") {
          try {
            data = JSON.parse(data);
          } catch {
            /**/
          }
        }

        if (typeof prompt !== "string" || typeof data !== "string") {
          alert("Invalid data");
          return;
        }

        const metas = registeredComponentMetasStore.get();
        const exclude = ["Body", "Slot"];

        const components = [...metas.keys()].filter(
          (name) => !exclude.includes(name)
        );

        abort.current = new AbortController();

        request<operations.Response>(
          [
            restAiOperations(),
            {
              method: "POST",
              body: JSON.stringify({
                prompt,
                components,
                jsx: data,
              }),
              signal: abort.current.signal,
            },
          ],
          { retry: 2 }
        )
          .then((result) => {
            if (result.success === false) {
              setError(result.message);
              return;
            }
            applyOperations(result.data);
          })
          .finally(() => {
            abort.current = undefined;
            setIsLoading(false);
          });

        setError(undefined);
        setIsLoading(true);
      }}
    >
      <Label>
        Prompt
        <InputField name="prompt" />
      </Label>
      <input type="hidden" name="data" value={JSON.stringify(jsx)} />
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
      return null;
    }

    const [rootInstanceId] = selectedInstanceSelector;
    const instance = instances.get(rootInstanceId);
    if (instance == null) {
      return null;
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
      .replace(/data-ws-component="[^"]+"/g, "")
      .replace(/\n(data-)/g, " $1")}`;
  }
);
