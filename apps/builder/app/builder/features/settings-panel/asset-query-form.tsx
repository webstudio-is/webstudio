import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  createDefaultStructuredAssetQueryResourceConfiguration,
  createStructuredAssetQueryResourceBody,
  parseStructuredAssetQueryResourceBody,
  type Resource,
  type StructuredAssetQueryFilterBinding,
  type StructuredAssetQueryResourceConfiguration,
} from "@webstudio-is/sdk";
import { assetsOpenApiUrl } from "@webstudio-is/sdk/runtime";
import {
  addConfiguredQueryFields,
  createQuerySourceCodec,
  loadOpenApiQueryDefinition,
  type QueryDefinition,
} from "@webstudio-is/query-builder";
import {
  getQueryConditions,
  getQueryFieldKey,
} from "@webstudio-is/query-builder/runtime";
import { Text, theme } from "@webstudio-is/design-system";
import { $assets } from "~/shared/sync/data-stores";
import { BindableQueryBuilder } from "~/builder/shared/query-builder";
import { fetch as builderFetch } from "~/shared/fetch.client";
import { CenteredPanelMessage, Row } from "./shared";

type AssetQueryDefinition = QueryDefinition<
  string,
  StructuredAssetQueryFilterBinding["operator"]
>;

const defaultConfiguration: StructuredAssetQueryResourceConfiguration =
  createDefaultStructuredAssetQueryResourceConfiguration();

const normalizeConfiguration = (
  value: StructuredAssetQueryResourceConfiguration
): StructuredAssetQueryResourceConfiguration => ({
  ...value,
  where: "field" in value.where ? { all: [value.where] } : value.where,
});

const loadAssetQueryDefinition = async (
  fetchDescription: typeof globalThis.fetch
) => {
  const response = await fetchDescription(assetsOpenApiUrl);
  if (response.ok === false) {
    throw new Error("Builder Assets OpenAPI request failed");
  }
  const descriptionUrl =
    response.url || new URL(assetsOpenApiUrl, window.location.href).href;
  const descriptionOrigin = new URL(descriptionUrl).origin;
  const definition = await loadOpenApiQueryDefinition({
    document: await response.json(),
    documentUrl: descriptionUrl,
    operationId: "queryAssets",
    loadReference: async (url) => {
      if (new URL(url).origin !== descriptionOrigin) {
        throw new Error("Cross-origin OpenAPI references are unsupported");
      }
      const reference = await fetchDescription(url);
      if (reference.ok === false) {
        throw new Error("Builder Assets query schema request failed");
      }
      return await reference.json();
    },
  });
  return definition as AssetQueryDefinition;
};

export const AssetQueryForm = ({
  resource,
  scope,
  aliases,
  sourceContainer,
  fetchDescription = builderFetch,
}: {
  resource?: Resource;
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  sourceContainer?: Element | null;
  fetchDescription?: typeof globalThis.fetch;
}) => {
  const assets = useStore($assets);
  const initial = useMemo(
    () =>
      parseStructuredAssetQueryResourceBody(resource?.body) ??
      defaultConfiguration,
    [resource?.body]
  );
  const [configuration, setConfiguration] =
    useState<StructuredAssetQueryResourceConfiguration>(() =>
      normalizeConfiguration(initial)
    );
  const [baseDefinition, setBaseDefinition] = useState<AssetQueryDefinition>();
  const [descriptionError, setDescriptionError] = useState<string>();
  const configuredPaths = useMemo(
    () =>
      [
        ...getQueryConditions<StructuredAssetQueryFilterBinding>(
          configuration.where
        ).map(({ field }) => field),
        ...configuration.sort.map(({ field }) => field),
        ...(configuration.output.mode === "fields"
          ? configuration.output.fields
          : []),
      ].sort((left, right) =>
        getQueryFieldKey(left).localeCompare(getQueryFieldKey(right))
      ),
    [configuration]
  );
  const definition = useMemo(
    () =>
      baseDefinition === undefined
        ? undefined
        : addConfiguredQueryFields({
            definition: baseDefinition,
            paths: configuredPaths,
            fallbackType: "string",
          }),
    [baseDefinition, configuredPaths]
  );
  const configurationError = useMemo(() => {
    if (definition === undefined) {
      return;
    }
    try {
      createQuerySourceCodec<
        string,
        StructuredAssetQueryFilterBinding["operator"],
        StructuredAssetQueryResourceConfiguration
      >(definition).format(configuration);
    } catch {
      return "Complete every Assets query field.";
    }
  }, [configuration, definition]);

  useEffect(() => {
    setConfiguration(normalizeConfiguration(initial));
  }, [initial, resource?.id]);

  const body =
    configurationError === undefined
      ? createStructuredAssetQueryResourceBody(configuration)
      : (resource?.body ?? "");

  useEffect(() => {
    let ignore = false;
    loadAssetQueryDefinition(fetchDescription)
      .then((definition) => {
        if (ignore) {
          return;
        }
        setBaseDefinition(definition);
        setDescriptionError(undefined);
      })
      .catch(() => {
        if (ignore === false) {
          setDescriptionError("Unable to load the Assets API description.");
        }
      });
    return () => {
      ignore = true;
    };
  }, [assets, fetchDescription]);

  return (
    <>
      <input
        type="hidden"
        name="asset-query-valid"
        value={configurationError === undefined ? "true" : "false"}
      />
      <input type="hidden" name="header-name" value="Content-Type" />
      <input type="hidden" name="header-value" value='"application/json"' />
      <input type="hidden" name="body" value={body} />
      {descriptionError !== undefined ? (
        <CenteredPanelMessage color="destructive">
          {descriptionError}
        </CenteredPanelMessage>
      ) : definition !== undefined ? (
        <BindableQueryBuilder<
          string,
          StructuredAssetQueryFilterBinding["operator"],
          StructuredAssetQueryResourceConfiguration
        >
          key={resource?.id}
          value={configuration}
          capabilities={definition}
          scope={scope}
          aliases={aliases}
          sourceContainer={sourceContainer}
          sectionPaddingInline={theme.panel.paddingInline}
          onChange={(value) => {
            setConfiguration(value);
          }}
        />
      ) : (
        <CenteredPanelMessage>Loading query editor…</CenteredPanelMessage>
      )}
      {descriptionError === undefined && configurationError !== undefined && (
        <Row>
          <Text color="destructive">{configurationError}</Text>
        </Row>
      )}
    </>
  );
};

export const __testing__ = { loadAssetQueryDefinition };
