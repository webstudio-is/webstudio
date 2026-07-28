import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  createStructuredAssetQueryResourceBody,
  parseStructuredAssetQueryResourceBody,
  type Resource,
  type StructuredAssetQueryFilterBinding,
  type StructuredAssetQueryResourceConfiguration,
} from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import { assetsOpenApiUrl } from "@webstudio-is/sdk/runtime";
import type {
  AssetObservedFieldType,
  AssetQueryFilter,
} from "@webstudio-is/content-engine";
import {
  addConfiguredQueryFields,
  getOpenApiQueryConfiguration,
  getQueryFieldKey,
  getQueryConditions,
  type QueryDefinition,
} from "@webstudio-is/query-builder";
import { Text, theme } from "@webstudio-is/design-system";
import { $assets } from "~/shared/sync/data-stores";
import { BindableQueryBuilder } from "~/builder/shared/query-builder";
import { fetch as builderFetch } from "~/shared/fetch.client";
import { getAssetQueryConfigurationError } from "./asset-query-form-utils";

type AssetQueryDefinition = QueryDefinition<
  AssetObservedFieldType,
  AssetQueryFilter["operator"]
>;

const defaultConfiguration: StructuredAssetQueryResourceConfiguration = {
  where: { all: [] },
  sort: [],
  limit: String(assetResourceLimits.defaultResultCount),
  offset: "0",
  output: { mode: "all", includeMetadata: true },
  content: { mode: "none" },
};

const normalizeConfiguration = (
  value: StructuredAssetQueryResourceConfiguration
): StructuredAssetQueryResourceConfiguration => ({
  ...value,
  where: "field" in value.where ? { all: [value.where] } : value.where,
});

export const AssetQueryForm = ({
  resource,
  scope,
  aliases,
  queryDefined,
  onQueryDefined,
}: {
  resource?: Resource;
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  queryDefined: boolean;
  onQueryDefined: () => void;
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
  const configurationError = getAssetQueryConfigurationError(configuration);
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

  useEffect(() => {
    setConfiguration(normalizeConfiguration(initial));
  }, [initial, resource?.id]);

  const body =
    configurationError === undefined
      ? createStructuredAssetQueryResourceBody(configuration)
      : (resource?.body ?? "");

  useEffect(() => {
    let ignore = false;
    builderFetch(assetsOpenApiUrl)
      .then(async (response) => {
        if (response.ok === false) {
          throw new Error("Builder Assets OpenAPI request failed");
        }
        return await response.json();
      })
      .then((response) => {
        if (ignore) {
          return;
        }
        setBaseDefinition(
          getOpenApiQueryConfiguration({
            document: response,
            operationId: "queryAssets",
          }).definition as AssetQueryDefinition
        );
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
  }, [assets]);

  return (
    <>
      {queryDefined && (
        <>
          <input
            type="hidden"
            name="asset-query-valid"
            value={configurationError === undefined ? "true" : "false"}
          />
          <input type="hidden" name="header-name" value="Content-Type" />
          <input type="hidden" name="header-value" value='"application/json"' />
          <input type="hidden" name="body" value={body} />
        </>
      )}
      {definition !== undefined && (
        <BindableQueryBuilder<
          AssetObservedFieldType,
          AssetQueryFilter["operator"],
          StructuredAssetQueryResourceConfiguration
        >
          key={resource?.id}
          value={configuration}
          capabilities={definition}
          scope={scope}
          aliases={aliases}
          sectionPaddingInline={theme.panel.paddingInline}
          onChange={(value) => {
            setConfiguration(value);
            onQueryDefined();
          }}
        />
      )}
      {descriptionError !== undefined && (
        <Text color="destructive">{descriptionError}</Text>
      )}
      {configurationError !== undefined && (
        <Text color="destructive">{configurationError}</Text>
      )}
    </>
  );
};
