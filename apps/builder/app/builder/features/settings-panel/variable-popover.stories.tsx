import { useEffect, useState } from "react";
import { Box, StorySection, theme } from "@webstudio-is/design-system";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  createAssetQueryJsonSchema,
  createAssetResourceOpenApi,
} from "@webstudio-is/protocol/asset-resource-api";
import {
  createDefaultStructuredAssetQueryResourceConfiguration,
  createStructuredAssetQueryResourceBody,
  type DataSource,
  type Resource,
} from "@webstudio-is/sdk";
import {
  assetsResourceUrl,
  assetsOpenApiUrl,
  currentDateResourceUrl,
  sitemapResourceUrl,
} from "@webstudio-is/sdk/runtime";
import {
  $allSelectedInstanceSelectors,
  $planFeatures,
  $selectedPageId,
  selectInstance,
} from "~/shared/nano-states";
import {
  $dataSources,
  $instances,
  $pages,
  $props,
  $resources,
} from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import { RequestFixture } from "~/shared/storybook/request-fixture";
import { $variableToOpen } from "./variable-navigation";
import { VariablePopoverTrigger } from "./variable-popover";

registerContainers();

export default {
  title: "Settings panel/Variable popover",
  component: VariablePopoverTrigger,
};

const VariableStory = ({
  variable,
  resource,
  shadowed = false,
  invalidName = false,
}: {
  variable: DataSource;
  resource?: Resource;
  shadowed?: boolean;
  invalidName?: boolean;
}) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const previous = {
      dataSources: $dataSources.get(),
      instances: $instances.get(),
      pages: $pages.get(),
      props: $props.get(),
      resources: $resources.get(),
      selectedPageId: $selectedPageId.get(),
      selectedInstances: $allSelectedInstanceSelectors.get(),
      variableToOpen: $variableToOpen.get(),
      planFeatures: $planFeatures.get(),
    };
    const ancestor: DataSource = {
      id: "ancestor-variable",
      type: "variable",
      name: variable.name,
      scopeInstanceId: "body",
      value: { type: "string", value: "Parent value" },
    };
    $instances.set(
      new Map([
        [
          "body",
          {
            id: "body",
            type: "instance",
            component: "Body",
            children: [{ type: "id", value: "box" }],
          },
        ],
        [
          "box",
          { id: "box", type: "instance", component: "Box", children: [] },
        ],
      ])
    );
    $pages.set(createDefaultPages({ rootInstanceId: "body" }));
    $planFeatures.set({ ...previous.planFeatures, allowDynamicData: true });
    $props.set(new Map());
    $resources.set(new Map(resource ? [[resource.id, resource]] : []));
    $dataSources.set(
      new Map([
        [variable.id, variable],
        ...(shadowed ? ([[ancestor.id, ancestor]] as const) : []),
      ])
    );
    $selectedPageId.set("home");
    selectInstance(["box", "body"]);
    setReady(true);

    return () => {
      $dataSources.set(previous.dataSources);
      $instances.set(previous.instances);
      $pages.set(previous.pages);
      $props.set(previous.props);
      $resources.set(previous.resources);
      $selectedPageId.set(previous.selectedPageId);
      $allSelectedInstanceSelectors.set(previous.selectedInstances);
      $variableToOpen.set(previous.variableToOpen);
      $planFeatures.set(previous.planFeatures);
    };
  }, [variable, resource, shadowed]);

  useEffect(() => {
    if (ready) {
      $variableToOpen.set({ id: variable.id });
    }
  }, [ready, variable.id]);

  return (
    <StorySection title="Variable editor">
      <Box
        data-floating-panel-container
        css={{ width: theme.sizes.sidebarWidth, height: 700 }}
      >
        {ready && (
          <VariablePopoverTrigger
            variable={variable}
            onOpenChange={(open) => {
              if (open && invalidName) {
                requestAnimationFrame(() => {
                  document
                    .querySelector<HTMLInputElement>(
                      '[data-variable-editor-dialog] input[name="name"]'
                    )
                    ?.checkValidity();
                });
              }
            }}
          >
            <button type="button">Edit variable</button>
          </VariablePopoverTrigger>
        )}
      </Box>
    </StorySection>
  );
};

const valueStory = (value: DataSource & { type: "variable" }) => () => (
  <VariableStory variable={value} />
);

export const String = valueStory({
  id: "story-variable",
  type: "variable",
  name: "title",
  scopeInstanceId: "box",
  value: { type: "string", value: "Example" },
});

export const Number = valueStory({
  id: "story-variable",
  type: "variable",
  name: "count",
  scopeInstanceId: "box",
  value: { type: "number", value: 42 },
});

export const Boolean = valueStory({
  id: "story-variable",
  type: "variable",
  name: "visible",
  scopeInstanceId: "box",
  value: { type: "boolean", value: true },
});

export const Json = valueStory({
  id: "story-variable",
  type: "variable",
  name: "items",
  scopeInstanceId: "box",
  value: { type: "json", value: { first: "Example", second: 2 } },
});

const resourceStory = (resource: Resource) => {
  const variable: DataSource = {
    id: "story-variable",
    type: "resource",
    name: resource.name,
    scopeInstanceId: "box",
    resourceId: resource.id,
  };
  return () => <VariableStory variable={variable} resource={resource} />;
};

export const Http = resourceStory({
  id: "story-resource",
  name: "Products",
  method: "get",
  url: JSON.stringify("https://example.com/products"),
  headers: [],
});

export const Graphql = resourceStory({
  id: "story-resource",
  name: "Products",
  control: "graphql",
  method: "post",
  url: JSON.stringify("https://example.com/graphql"),
  headers: [],
});

const assetsResource: Resource = {
  id: "story-resource",
  name: "Assets",
  control: "system",
  method: "post",
  url: JSON.stringify(assetsResourceUrl),
  headers: [],
  body: createStructuredAssetQueryResourceBody(
    createDefaultStructuredAssetQueryResourceConfiguration()
  ),
};

const assetsOpenApi = createAssetResourceOpenApi({
  builderSessionCookieName: "session",
  querySchemaReference: "/rest/assets/query-schema.json",
});
const assetsQuerySchema = createAssetQueryJsonSchema({
  catalog: {
    format: "webstudio-builder-asset-field-catalog",
    version: 1,
    canonicalRevision: `sha256:${"a".repeat(64)}`,
    documentCount: 0,
    fields: {},
  },
});
const assetsRequest = (request: Request) => {
  if (request.url.includes("query-schema.json")) {
    return Response.json(assetsQuerySchema);
  }
  if (request.url.includes(assetsOpenApiUrl)) {
    return Response.json(assetsOpenApi);
  }
};
const assetsPending = (request: Request) =>
  request.url.includes(assetsOpenApiUrl)
    ? new Promise<Response>(() => {})
    : undefined;
const assetsError = (request: Request) =>
  request.url.includes(assetsOpenApiUrl)
    ? new Response(undefined, { status: 500 })
    : undefined;
const AssetsVariable = resourceStory(assetsResource);
export const Assets = () => (
  <RequestFixture request={assetsRequest}>
    <AssetsVariable />
  </RequestFixture>
);
export const AssetsDescriptionPending = () => (
  <RequestFixture request={assetsPending}>
    <AssetsVariable />
  </RequestFixture>
);
export const AssetsDescriptionError = () => (
  <RequestFixture request={assetsError}>
    <AssetsVariable />
  </RequestFixture>
);

export const Email = resourceStory({
  id: "story-resource",
  name: "Email",
  control: "email",
  method: "post",
  url: '""',
  headers: [],
  email: {},
});

export const Sitemap = resourceStory({
  id: "story-resource",
  name: "Sitemap",
  control: "system",
  method: "get",
  url: JSON.stringify(sitemapResourceUrl),
  headers: [],
});

export const CurrentDate = resourceStory({
  id: "story-resource",
  name: "Current date",
  control: "system",
  method: "get",
  url: JSON.stringify(currentDateResourceUrl),
  headers: [],
});

const parameterVariable: DataSource = {
  id: "story-variable",
  type: "parameter",
  name: "query",
  scopeInstanceId: "box",
};
const shadowVariable: DataSource = {
  id: "story-variable",
  type: "variable",
  name: "title",
  scopeInstanceId: "box",
  value: { type: "string", value: "Child value" },
};
const invalidVariable: DataSource = {
  id: "story-variable",
  type: "variable",
  name: "",
  scopeInstanceId: "box",
  value: { type: "string", value: "Example" },
};

export const Parameter = () => <VariableStory variable={parameterVariable} />;
export const ShadowWarning = () => (
  <VariableStory variable={shadowVariable} shadowed />
);
export const InvalidName = () => (
  <VariableStory variable={invalidVariable} invalidName />
);
