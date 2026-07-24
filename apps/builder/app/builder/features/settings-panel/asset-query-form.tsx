import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  assetQueryResult,
  assetQueryStandardFields,
  assetQueryStandardFieldTypes,
  assetResourceLimits,
  builderAssetFieldCatalog,
  isLiteralExpression,
  getAssetQueryOperatorsForFieldTypes,
  type AssetQueryFilter,
  type AssetObservedFieldType,
  type AssetQuerySort,
  type AssetResourceContentOptions,
  type BuilderAssetFieldCatalog,
  type Resource,
  type StructuredAssetQueryFilterBinding,
  type StructuredAssetQueryResourceConfiguration,
} from "@webstudio-is/sdk";
import {
  Flex,
  Grid,
  InputField,
  Label,
  Select,
  SmallIconButton,
  Switch,
  Text,
} from "@webstudio-is/design-system";
import { PlusIcon, TrashIcon } from "@webstudio-is/icons";
import { $assets } from "~/shared/sync/data-stores";
import {
  BindingControl,
  BindingPopover,
  evaluateExpressionWithinScope,
} from "~/builder/shared/binding-popover";
import { ExpressionEditor } from "~/builder/shared/expression-editor";
import { CodeEditor } from "~/shared/code-editor";
import {
  loadBuilderAssetFieldCatalog,
  previewBuilderAssetQuery,
} from "~/shared/asset-resource-api.client";
import {
  createStructuredAssetQueryResourceBody,
  getAssetQueryConfigurationError,
  isEmptyAssetQueryResult,
  parseStructuredAssetQueryResourceBody,
} from "./asset-query-form-utils";

type FieldOption = {
  path: string[];
  label: string;
  types: AssetObservedFieldType[];
};

const standardFieldLabels: Record<
  (typeof assetQueryStandardFields)[number],
  string
> = {
  id: "ID",
  name: "Name",
  path: "Path",
  key: "Key",
  folderId: "Folder ID",
  extension: "Extension",
  mimeType: "MIME type",
  size: "Size",
  revision: "Revision",
  excerpt: "Excerpt",
};
const standardFields: FieldOption[] = assetQueryStandardFields.map((field) => ({
  path: [field],
  label: standardFieldLabels[field],
  types: [...assetQueryStandardFieldTypes[field]],
}));

const fieldKey = (path: readonly string[]) => JSON.stringify(path);

const getFieldOptions = (
  catalog: BuilderAssetFieldCatalog | undefined
): FieldOption[] => {
  const options = new Map(
    standardFields.map((option) => [fieldKey(option.path), option])
  );
  for (const field of Object.values(catalog?.fields ?? {})) {
    if (field.queryPath?.[0] !== "properties") {
      continue;
    }
    options.set(fieldKey(field.queryPath), {
      path: field.queryPath,
      label: field.queryPath.join(" / "),
      types: field.types,
    });
  }
  return [...options.values()];
};

const getOperators = (types: readonly AssetObservedFieldType[]) =>
  getAssetQueryOperatorsForFieldTypes(types);

const operatorLabels: Record<AssetQueryFilter["operator"], string> = {
  eq: "Equals",
  ne: "Does not equal",
  in: "Is one of",
  contains: "Contains",
  startsWith: "Starts with",
  endsWith: "Ends with",
  gt: "Greater than",
  gte: "Greater than or equal",
  lt: "Less than",
  lte: "Less than or equal",
  exists: "Exists",
  isEmpty: "Is empty",
};

const defaultFilterValue = (operator: AssetQueryFilter["operator"]) =>
  operator === "in"
    ? "[]"
    : operator === "exists" || operator === "isEmpty"
      ? "true"
      : '""';

const BoundExpression = ({
  label,
  value,
  scope,
  aliases,
  onChange,
}: {
  label: string;
  value: string;
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  onChange: (value: string) => void;
}) => (
  <BindingControl>
    <div>
      <ExpressionEditor
        aria-label={label}
        value={value}
        onChange={onChange}
        onChangeComplete={onChange}
      />
    </div>
    <BindingPopover
      scope={scope}
      aliases={aliases}
      variant={isLiteralExpression(value) ? "default" : "bound"}
      value={value}
      onChange={onChange}
      onRemove={(literal) => onChange(JSON.stringify(literal))}
    />
  </BindingControl>
);

const Filters = ({
  fields,
  filters,
  scope,
  aliases,
  onChange,
}: {
  fields: FieldOption[];
  filters: StructuredAssetQueryFilterBinding[];
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  onChange: (filters: StructuredAssetQueryFilterBinding[]) => void;
}) => (
  <Grid gap={2}>
    <Flex justify="between" align="center">
      <Label>Filters</Label>
      <SmallIconButton
        aria-label="Add asset filter"
        icon={<PlusIcon />}
        disabled={filters.length >= assetResourceLimits.filterCount}
        onClick={() =>
          onChange([
            ...filters,
            { field: ["path"], operator: "startsWith", value: '""' },
          ])
        }
      />
    </Flex>
    {filters.map((filter, index) => {
      const selectedField =
        fields.find(
          (field) => fieldKey(field.path) === fieldKey(filter.field)
        ) ?? fields[0];
      const operators = getOperators(selectedField.types);
      return (
        <Grid key={index} gap={1}>
          <Grid
            gap={1}
            align="center"
            css={{ gridTemplateColumns: "1fr 1fr min-content" }}
          >
            <Select<FieldOption>
              aria-label="Asset filter field"
              options={fields}
              getLabel={(field) => field.label}
              getValue={(field) => fieldKey(field.path)}
              value={selectedField}
              onChange={(field) => {
                const next = [...filters];
                const nextOperators = getOperators(field.types);
                const operator = nextOperators.includes(filter.operator)
                  ? filter.operator
                  : nextOperators[0];
                next[index] = {
                  ...filter,
                  field: field.path,
                  operator,
                  value:
                    operator === filter.operator
                      ? filter.value
                      : defaultFilterValue(operator),
                };
                onChange(next);
              }}
            />
            <Select<AssetQueryFilter["operator"]>
              aria-label="Asset filter operator"
              options={operators}
              getLabel={(operator: AssetQueryFilter["operator"]) =>
                operatorLabels[operator]
              }
              value={filter.operator}
              onChange={(operator: AssetQueryFilter["operator"]) => {
                const next = [...filters];
                next[index] = {
                  ...filter,
                  operator,
                  value: defaultFilterValue(operator),
                };
                onChange(next);
              }}
            />
            <SmallIconButton
              aria-label="Delete asset filter"
              variant="destructive"
              icon={<TrashIcon />}
              onClick={() =>
                onChange(filters.filter((_, position) => position !== index))
              }
            />
          </Grid>
          <BoundExpression
            label="Asset filter value"
            value={filter.value}
            scope={scope}
            aliases={aliases}
            onChange={(value) => {
              const next = [...filters];
              next[index] = { ...filter, value };
              onChange(next);
            }}
          />
        </Grid>
      );
    })}
    {filters.length === 0 && (
      <Text color="subtle">All assets are included.</Text>
    )}
  </Grid>
);

const Sorting = ({
  fields,
  sort,
  onChange,
}: {
  fields: FieldOption[];
  sort: AssetQuerySort[];
  onChange: (sort: AssetQuerySort[]) => void;
}) => (
  <Grid gap={2}>
    <Flex justify="between" align="center">
      <Label>Sort</Label>
      <SmallIconButton
        aria-label="Add asset sort"
        icon={<PlusIcon />}
        disabled={sort.length >= assetResourceLimits.sortCount}
        onClick={() =>
          onChange([...sort, { field: ["name"], direction: "asc" }])
        }
      />
    </Flex>
    {sort.map((order, index) => {
      const selectedField =
        fields.find(
          (field) => fieldKey(field.path) === fieldKey(order.field)
        ) ?? fields[0];
      return (
        <Grid
          key={index}
          gap={1}
          align="center"
          css={{ gridTemplateColumns: "1fr 110px min-content" }}
        >
          <Select<FieldOption>
            aria-label="Asset sort field"
            options={fields.filter(
              ({ types }) =>
                types.includes("object") === false &&
                types.includes("array") === false
            )}
            getLabel={(field) => field.label}
            getValue={(field) => fieldKey(field.path)}
            value={selectedField}
            onChange={(field) => {
              const next = [...sort];
              next[index] = { ...order, field: field.path };
              onChange(next);
            }}
          />
          <Select<AssetQuerySort["direction"]>
            aria-label="Asset sort direction"
            options={["asc", "desc"] as const}
            getLabel={(direction: AssetQuerySort["direction"]) =>
              direction === "asc" ? "Ascending" : "Descending"
            }
            value={order.direction}
            onChange={(direction: AssetQuerySort["direction"]) => {
              const next = [...sort];
              next[index] = { ...order, direction };
              onChange(next);
            }}
          />
          <SmallIconButton
            aria-label="Delete asset sort"
            variant="destructive"
            icon={<TrashIcon />}
            onClick={() =>
              onChange(sort.filter((_, position) => position !== index))
            }
          />
        </Grid>
      );
    })}
  </Grid>
);

const ContentOptions = ({
  value,
  onChange,
}: {
  value: AssetResourceContentOptions;
  onChange: (value: AssetResourceContentOptions) => void;
}) => (
  <Grid gap={1}>
    <Label>File content</Label>
    <Select<AssetResourceContentOptions["mode"]>
      aria-label="Asset content mode"
      options={["none", "markdown-body", "full", "range"] as const}
      getLabel={(mode: AssetResourceContentOptions["mode"]) =>
        mode === "none"
          ? "Metadata only"
          : mode === "markdown-body"
            ? "Markdown body"
            : mode === "full"
              ? "Full file"
              : "Byte range"
      }
      value={value.mode}
      onChange={(mode: AssetResourceContentOptions["mode"]) =>
        onChange(
          mode === "range"
            ? { mode, offset: 0, length: 1024 }
            : mode === "none"
              ? { mode }
              : { mode, maxBytes: assetResourceLimits.hydratedFileBytes }
        )
      }
    />
    {value.mode === "range" && (
      <Grid gap={1} css={{ gridTemplateColumns: "1fr 1fr" }}>
        <InputField
          aria-label="Content byte offset"
          type="number"
          min={0}
          value={String(value.offset)}
          onChange={(event) =>
            onChange({ ...value, offset: Number(event.target.value) })
          }
        />
        <InputField
          aria-label="Content byte length"
          type="number"
          min={1}
          value={String(value.length)}
          onChange={(event) =>
            onChange({ ...value, length: Number(event.target.value) })
          }
        />
      </Grid>
    )}
    {(value.mode === "full" || value.mode === "markdown-body") && (
      <InputField
        aria-label="Maximum content bytes"
        type="number"
        min={1}
        value={value.maxBytes === undefined ? "" : String(value.maxBytes)}
        onChange={(event) =>
          onChange({
            ...value,
            maxBytes:
              event.target.value === ""
                ? undefined
                : Number(event.target.value),
          })
        }
      />
    )}
  </Grid>
);

const AssetQueryPreview = ({
  configuration,
  scope,
  enabled,
}: {
  configuration: StructuredAssetQueryResourceConfiguration;
  scope: Record<string, unknown>;
  enabled: boolean;
}) => {
  const [preview, setPreview] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; value: unknown }
  >({ type: "idle" });
  const input = {
    query: {
      filters: configuration.filters.map(({ field, operator, value }) => ({
        field,
        operator,
        value: evaluateExpressionWithinScope(value, scope),
      })),
      sort: configuration.sort,
      limit: evaluateExpressionWithinScope(configuration.limit, scope),
      offset: evaluateExpressionWithinScope(configuration.offset, scope),
      content: configuration.content,
    },
  };
  const inputKey = JSON.stringify(input);
  const inputRef = useRef({ key: inputKey, input });
  inputRef.current = { key: inputKey, input };

  useEffect(() => {
    setPreview({ type: "idle" });
    if (enabled === false) {
      return;
    }
    const requestedKey = inputKey;
    const timeout = setTimeout(async () => {
      setPreview({ type: "loading" });
      try {
        const response = await previewBuilderAssetQuery(inputRef.current.input);
        if (inputRef.current.key !== requestedKey) {
          return;
        }
        const parsed = assetQueryResult.safeParse(response.data);
        if (parsed.success === false) {
          const message =
            typeof response.data === "object" &&
            response.data !== null &&
            "error" in response.data &&
            typeof response.data.error === "object" &&
            response.data.error !== null &&
            "message" in response.data.error &&
            typeof response.data.error.message === "string"
              ? response.data.error.message
              : "The preview response was invalid.";
          setPreview({ type: "error", message });
          return;
        }
        setPreview({ type: "success", value: parsed.data });
      } catch {
        if (inputRef.current.key === requestedKey) {
          setPreview({ type: "error", message: "The query preview failed." });
        }
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [enabled, inputKey]);

  return (
    <Grid gap={2}>
      <Label>Preview</Label>
      {preview.type === "loading" && (
        <Text color="subtle">Loading preview…</Text>
      )}
      {preview.type === "error" && (
        <Text color="destructive">{preview.message}</Text>
      )}
      {preview.type === "success" && isEmptyAssetQueryResult(preview.value) && (
        <Text color="subtle">The query returned no assets.</Text>
      )}
      {preview.type === "success" &&
        isEmptyAssetQueryResult(preview.value) === false && (
          <CodeEditor
            lang="json"
            title="Query preview"
            size="small"
            readOnly={true}
            value={JSON.stringify(preview.value, null, 2)}
            onChange={() => {}}
            onChangeComplete={() => {}}
          />
        )}
    </Grid>
  );
};

const defaultConfiguration: StructuredAssetQueryResourceConfiguration = {
  filters: [],
  sort: [],
  limit: String(assetResourceLimits.defaultResultCount),
  offset: "0",
  content: { mode: "none" },
};

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
  const [filters, setFilters] = useState(initial.filters);
  const [sort, setSort] = useState(initial.sort);
  const [limit, setLimit] = useState(initial.limit);
  const [offset, setOffset] = useState(initial.offset);
  const [content, setContent] = useState(initial.content);
  const [catalog, setCatalog] = useState<BuilderAssetFieldCatalog>();
  const configuration = { filters, sort, limit, offset, content };
  const configurationError = getAssetQueryConfigurationError(configuration);
  const fields = useMemo(() => getFieldOptions(catalog), [catalog]);
  const body =
    configurationError === undefined
      ? createStructuredAssetQueryResourceBody(configuration)
      : (resource?.body ?? "");

  useEffect(() => {
    if (enabled === false) {
      return;
    }
    let ignore = false;
    loadBuilderAssetFieldCatalog()
      .then((response) => {
        if (ignore) {
          return;
        }
        const parsed = builderAssetFieldCatalog.safeParse(response.data);
        setCatalog(parsed.success ? parsed.data : undefined);
      })
      .catch(() => {
        if (ignore === false) {
          setCatalog(undefined);
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
          <Filters
            fields={fields}
            filters={filters}
            scope={scope}
            aliases={aliases}
            onChange={setFilters}
          />
          <Sorting fields={fields} sort={sort} onChange={setSort} />
          <Grid gap={2} css={{ gridTemplateColumns: "1fr 1fr" }}>
            <Grid gap={1}>
              <Label>Limit</Label>
              <BoundExpression
                label="Asset query limit"
                value={limit}
                scope={scope}
                aliases={aliases}
                onChange={setLimit}
              />
            </Grid>
            <Grid gap={1}>
              <Label>Offset</Label>
              <BoundExpression
                label="Asset query offset"
                value={offset}
                scope={scope}
                aliases={aliases}
                onChange={setOffset}
              />
            </Grid>
          </Grid>
          <ContentOptions value={content} onChange={setContent} />
          {configurationError !== undefined && (
            <Text color="destructive">{configurationError}</Text>
          )}
          <AssetQueryPreview
            configuration={configuration}
            scope={scope}
            enabled={configurationError === undefined}
          />
        </>
      )}
    </>
  );
};
