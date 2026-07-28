import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  addConfiguredAssetQueryFields,
  createAssetQueryCapabilities,
  createStructuredAssetQueryResourceBody,
  parseAssetQueryCapabilities,
  parseStructuredAssetQueryResourceBody,
  type AssetQueryCapabilities,
  type Resource,
  type StructuredAssetQueryFilterBinding,
  type StructuredAssetQueryResourceConfiguration,
} from "@webstudio-is/sdk";
import { assetsQueryCapabilitiesApiUrl } from "@webstudio-is/sdk/runtime";
import type {
  AssetObservedFieldType,
  AssetQueryFilter,
} from "@webstudio-is/content-engine";
import {
  createStructuredQuery,
  getQueryFieldKey,
  getQueryConditions,
  normalizeStructuredQuery,
} from "@webstudio-is/query-builder";
import { Flex, Label, Switch, Text } from "@webstudio-is/design-system";
import { $assets } from "~/shared/sync/data-stores";
import { BindableQueryBuilder } from "~/builder/shared/query-builder";
import { fetch as builderFetch } from "~/shared/fetch.client";
import { getAssetQueryConfigurationError } from "./asset-query-form-utils";

const fallbackCapabilities = createAssetQueryCapabilities({});
const defaultConfiguration = createStructuredQuery(
  fallbackCapabilities
) as StructuredAssetQueryResourceConfiguration;

export const AssetQueryForm = ({
  resource,
  scope,
  aliases,
  enabled,
  enabledId,
  onEnabledChange,
}: {
  resource?: Resource;
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  enabled: boolean;
  enabledId: string;
  onEnabledChange: (enabled: boolean) => void;
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
      normalizeStructuredQuery(initial, fallbackCapabilities)
    );
  const [baseCapabilities, setBaseCapabilities] =
    useState<AssetQueryCapabilities>(() => fallbackCapabilities);
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
  const capabilities = useMemo(() => {
    return addConfiguredAssetQueryFields({
      capabilities: baseCapabilities,
      configuredPaths,
    });
  }, [baseCapabilities, configuredPaths]);

  useEffect(() => {
    setConfiguration(normalizeStructuredQuery(initial, fallbackCapabilities));
  }, [initial, resource?.id]);

  const body =
    configurationError === undefined
      ? createStructuredAssetQueryResourceBody(configuration)
      : (resource?.body ?? "");

  useEffect(() => {
    if (enabled === false) {
      return;
    }
    let ignore = false;
    builderFetch(assetsQueryCapabilitiesApiUrl)
      .then(async (response) => {
        if (response.ok === false) {
          throw new Error("Builder asset query capabilities request failed");
        }
        return await response.json();
      })
      .then((response) => {
        if (ignore) {
          return;
        }
        setBaseCapabilities(parseAssetQueryCapabilities(response));
      })
      .catch(() => {
        if (ignore === false) {
          setBaseCapabilities(createAssetQueryCapabilities({}));
        }
      });
    return () => {
      ignore = true;
    };
  }, [assets, enabled]);

  return (
    <>
      <Flex align="center" gap={2}>
        <Switch
          id={enabledId}
          checked={enabled}
          onCheckedChange={onEnabledChange}
        />
        <Label htmlFor={enabledId}>Configure query</Label>
      </Flex>
      {enabled && (
        <>
          <input
            type="hidden"
            name="asset-query-valid"
            value={configurationError === undefined ? "true" : "false"}
          />
          <input type="hidden" name="header-name" value="Content-Type" />
          <input type="hidden" name="header-value" value='"application/json"' />
          <input type="hidden" name="body" value={body} />
          <BindableQueryBuilder<
            AssetObservedFieldType,
            AssetQueryFilter["operator"],
            StructuredAssetQueryResourceConfiguration
          >
            key={resource?.id}
            value={configuration}
            capabilities={capabilities}
            scope={scope}
            aliases={aliases}
            onChange={setConfiguration}
          />
          {configurationError !== undefined && (
            <Text color="destructive">{configurationError}</Text>
          )}
        </>
      )}
    </>
  );
};
