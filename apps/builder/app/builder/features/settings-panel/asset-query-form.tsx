import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  createDefaultStructuredAssetQueryResourceConfiguration,
  createStructuredAssetQueryResourceBody,
  parseStructuredAssetQueryResourceBodyResult,
  type Resource,
  type StructuredAssetQueryFilterBinding,
  type StructuredAssetQueryResourceConfiguration,
} from "@webstudio-is/sdk";
import { assetsOpenApiUrl } from "@webstudio-is/sdk/runtime";
import {
  addConfiguredQueryFields,
  isQueryExpression,
  loadOpenApiQueryDefinition,
  type QueryDefinition,
} from "@webstudio-is/query-builder";
import {
  getQueryConditions,
  getQueryFieldKey,
} from "@webstudio-is/query-builder/runtime";
import {
  appendAssetFieldPath,
  validateAssetQuery,
  type AssetObservedFieldType,
  type AssetQuerySetupIssue,
  type BuilderAssetFieldCatalog,
} from "@webstudio-is/content-engine";
import { computeExpressionWithinScope } from "@webstudio-is/project-build/runtime";
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

const controlOrder = new Map([
  ["output", 1],
  ["result", 2],
]);

const normalizeConfiguration = (
  value: StructuredAssetQueryResourceConfiguration
): StructuredAssetQueryResourceConfiguration => ({
  ...value,
  result: value.result ?? "many",
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

const configureAssetQueryDefinition = ({
  definition,
  paths,
  result,
}: {
  definition: AssetQueryDefinition;
  paths: string[][];
  result: StructuredAssetQueryResourceConfiguration["result"];
}) => {
  const configured = addConfiguredQueryFields({
    definition,
    paths,
    fallbackType: "string",
  });
  return {
    ...configured,
    source: {
      ...configured.source,
      controls: configured.source.controls
        .filter(
          ({ key }) =>
            result === "many" || (key !== "limit" && key !== "offset")
        )
        .toSorted(
          (left, right) =>
            (controlOrder.get(left.key) ?? 0) -
            (controlOrder.get(right.key) ?? 0)
        ),
    },
  };
};

const createConfigurationIssue = (
  code: string,
  message: string,
  path: string[] = ["query"]
): AssetQuerySetupIssue => ({
  severity: "error",
  code,
  path,
  message,
});

const observedFieldTypes = new Set<AssetObservedFieldType>([
  "null",
  "boolean",
  "number",
  "string",
  "object",
  "array",
]);

const getAssetQueryCatalog = (
  definition: AssetQueryDefinition | undefined
): BuilderAssetFieldCatalog | undefined => {
  if (definition === undefined) {
    return;
  }
  const fields: BuilderAssetFieldCatalog["fields"] = {};
  for (const field of definition.fields) {
    if (field.path[0] !== "properties") {
      continue;
    }
    const types = [...new Set(field.types)]
      .filter((type): type is AssetObservedFieldType =>
        observedFieldTypes.has(type as AssetObservedFieldType)
      )
      .sort();
    if (types.length === 0) {
      continue;
    }
    let catalogPath = "properties";
    for (const segment of field.path.slice(1)) {
      catalogPath = appendAssetFieldPath(catalogPath, segment);
    }
    fields[catalogPath] = {
      queryPath: field.path,
      types,
      occurrences: 1,
      ...(types.length > 1 ? { mixed: true } : {}),
    };
  }
  return {
    format: "webstudio-builder-asset-field-catalog",
    version: 1,
    canonicalRevision: `sha256:${"0".repeat(64)}`,
    documentCount: 1,
    fields,
  };
};

const getAssetQueryConfigurationValidation = ({
  configuration,
  scope,
  definition,
}: {
  configuration: StructuredAssetQueryResourceConfiguration;
  scope: Record<string, unknown>;
  definition?: AssetQueryDefinition;
}): { body?: string; issues: readonly AssetQuerySetupIssue[] } => {
  const issues: AssetQuerySetupIssue[] = [];
  const invalidExpressionPaths = new Set<string>();
  const invalidExpressionPathValues: string[][] = [];
  const markInvalidExpression = (path: string[]) => {
    invalidExpressionPaths.add(JSON.stringify(path));
    invalidExpressionPathValues.push(path);
  };
  const evaluateExpression = (source: string, path: string[]) => {
    if (isQueryExpression(source) === false) {
      markInvalidExpression(path);
      issues.push(
        createConfigurationIssue(
          "INVALID_QUERY_EXPRESSION",
          "Enter a valid query expression.",
          path
        )
      );
      return;
    }
    try {
      return computeExpressionWithinScope(source, scope);
    } catch (error) {
      markInvalidExpression(path);
      issues.push(
        createConfigurationIssue(
          "INVALID_QUERY_EXPRESSION",
          error instanceof Error
            ? error.message
            : "The Assets query expression cannot be evaluated.",
          path
        )
      );
    }
  };
  const evaluateWhere = (
    where: StructuredAssetQueryResourceConfiguration["where"],
    path: string[]
  ): unknown => {
    if ("field" in where) {
      return {
        ...where,
        value: evaluateExpression(where.value, [...path, "value"]),
      };
    }
    if ("all" in where) {
      return {
        all: where.all.map((child, index) =>
          evaluateWhere(child, [...path, "all", String(index)])
        ),
      };
    }
    return {
      any: where.any.map((child, index) =>
        evaluateWhere(child, [...path, "any", String(index)])
      ),
    };
  };

  const query = {
    result: configuration.result,
    where: evaluateWhere(configuration.where, ["query", "where"]),
    sort: configuration.sort,
    ...(configuration.result === "many"
      ? {
          limit: evaluateExpression(configuration.limit, ["query", "limit"]),
          offset: evaluateExpression(configuration.offset, ["query", "offset"]),
        }
      : {}),
    output: configuration.output,
    content: configuration.content,
  };
  const validation = validateAssetQuery({
    query,
    catalog: getAssetQueryCatalog(definition),
  });
  issues.push(
    ...validation.issues.filter(
      (issue) =>
        invalidExpressionPaths.has(JSON.stringify(issue.path)) === false &&
        invalidExpressionPathValues.some(
          (invalidPath) =>
            issue.path.length < invalidPath.length &&
            issue.path.every((segment, index) => segment === invalidPath[index])
        ) === false
    )
  );

  if (issues.some(({ severity }) => severity === "error")) {
    return { issues };
  }

  let body: string;
  try {
    body = createStructuredAssetQueryResourceBody(configuration);
  } catch (error) {
    issues.push(
      createConfigurationIssue(
        "INVALID_QUERY_SOURCE",
        error instanceof Error
          ? error.message
          : "The Assets query configuration cannot be saved."
      )
    );
    return { issues };
  }

  return {
    body,
    issues: [
      ...new Map(
        issues.map((issue) => [
          JSON.stringify([issue.code, issue.path, issue.message]),
          issue,
        ])
      ).values(),
    ],
  };
};

export const AssetQueryForm = ({
  resource,
  scope,
  aliases,
  sourceContainer,
  fetchDescription = builderFetch,
  onPendingChange,
}: {
  resource?: Resource;
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  sourceContainer?: Element | null;
  fetchDescription?: typeof globalThis.fetch;
  onPendingChange?: (pending: boolean) => void;
}) => {
  const assets = useStore($assets);
  const initialResult = useMemo(
    () =>
      resource === undefined
        ? ({ success: true, value: defaultConfiguration } as const)
        : parseStructuredAssetQueryResourceBodyResult(resource.body),
    [resource]
  );
  const initial = initialResult.success
    ? initialResult.value
    : defaultConfiguration;
  const [configuration, setConfiguration] =
    useState<StructuredAssetQueryResourceConfiguration>(() =>
      normalizeConfiguration(initial)
    );
  const [storedConfigurationError, setStoredConfigurationError] = useState<
    string | undefined
  >(() => (initialResult.success ? undefined : initialResult.message));
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
  const definition = useMemo(() => {
    if (baseDefinition === undefined) {
      return;
    }
    return configureAssetQueryDefinition({
      definition: baseDefinition,
      paths: configuredPaths,
      result: configuration.result,
    });
  }, [baseDefinition, configuration.result, configuredPaths]);
  const configurationValidation = useMemo(
    () =>
      getAssetQueryConfigurationValidation({
        configuration,
        scope,
        definition: baseDefinition,
      }),
    [baseDefinition, configuration, scope]
  );
  const configurationIssues =
    storedConfigurationError === undefined
      ? configurationValidation.issues
      : [
          createConfigurationIssue(
            "INVALID_STORED_QUERY",
            storedConfigurationError
          ),
        ];
  const configurationHasErrors = configurationIssues.some(
    ({ severity }) => severity === "error"
  );

  useEffect(() => {
    setConfiguration(normalizeConfiguration(initial));
    setStoredConfigurationError(
      initialResult.success ? undefined : initialResult.message
    );
  }, [initial, initialResult, resource?.id]);

  const body =
    configurationHasErrors === false &&
    configurationValidation.body !== undefined
      ? configurationValidation.body
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

  useEffect(() => {
    onPendingChange?.(
      definition === undefined && descriptionError === undefined
    );
    return () => onPendingChange?.(false);
  }, [definition, descriptionError, onPendingChange]);

  return (
    <>
      <input
        type="hidden"
        name="asset-query-valid"
        value={configurationHasErrors ? "false" : "true"}
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
            setStoredConfigurationError(undefined);
            setConfiguration(
              configuration.result === "many" && value.result !== "many"
                ? {
                    ...value,
                    limit: defaultConfiguration.limit,
                    offset: defaultConfiguration.offset,
                  }
                : value
            );
          }}
        />
      ) : (
        <CenteredPanelMessage>Loading query editor…</CenteredPanelMessage>
      )}
      {descriptionError === undefined &&
        configurationIssues.map((issue, index) => (
          <Row key={`${issue.code}:${issue.path.join(".")}:${index}`}>
            <Text
              color={issue.severity === "error" ? "destructive" : undefined}
            >
              {issue.path.length === 0 ? "" : `${issue.path.join(".")}: `}
              {issue.message}
            </Text>
          </Row>
        ))}
    </>
  );
};

export const __testing__ = {
  configureAssetQueryDefinition,
  getAssetQueryConfigurationValidation,
  loadAssetQueryDefinition,
};
