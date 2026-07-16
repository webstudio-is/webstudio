import type { Instance, Prop } from "@webstudio-is/sdk";
import type { BuilderState } from "../state/builder-state";
import { state } from "./runtime.test-fixtures";

export const createResourceCollectionIntegrationFixture = () => {
  const instances = new Map<string, Instance>(state.instances);
  instances.set("results-controller", {
    type: "instance",
    id: "results-controller",
    component: "HtmlEmbed",
    children: [],
  });
  instances.set("body", {
    ...instances.get("body")!,
    children: [
      ...instances.get("body")!.children,
      { type: "id" as const, value: "results-controller" },
    ],
  });
  const props = new Map<string, Prop>(state.props);
  props.set("results-controller-code", {
    id: "results-controller-code",
    instanceId: "results-controller",
    name: "code",
    type: "string",
    value: "window.resultsController?.mount()",
  });

  return {
    state: { ...state, instances, props } satisfies BuilderState,
    input: {
      parentInstanceId: "body",
      variables: [
        {
          name: "ResultsLabel",
          value: { type: "string" as const, value: "Search results" },
        },
      ],
      resources: [
        {
          resource: {
            name: "Search results",
            method: "get" as const,
            url: "https://api.example.com/results",
            headers: [],
          },
          dataSourceName: "SearchResults",
          exposeAsDataSource: true,
        },
      ],
      structure: {
        type: "collection" as const,
        data: { type: "expression" as const, value: "SearchResults.data" },
        itemFragment: {
          children: [{ type: "id" as const, value: "result-card" }],
          instances: [
            {
              type: "instance" as const,
              id: "result-card",
              component: "Text",
              tag: "article",
              children: [
                { type: "expression" as const, value: "collectionItem.title" },
              ],
            },
          ],
          props: [],
          dataSources: [],
          resources: [],
          styleSources: [],
          styleSourceSelections: [],
          styles: [],
          breakpoints: [],
          assets: [],
        },
      },
      bindings: [
        {
          target: { type: "insertedRoot" as const, index: 0 },
          name: "aria-label",
          binding: { type: "expression" as const, value: "ResultsLabel" },
        },
      ],
      retainedBehavior: [
        {
          instanceId: "results-controller",
          responsibility: "Keyboard navigation and result activation",
        },
      ],
      unsupportedConversions: [
        {
          behavior: "Third-party analytics callback",
          reason:
            "The callback contract is external and must remain script-owned.",
        },
      ],
    },
  };
};
