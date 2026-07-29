import { z } from "zod";
import { computed } from "nanostores";
import {
  forwardRef,
  lazy,
  Suspense,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useStore } from "@nanostores/react";
import {
  encodeDataVariableId,
  isAssetsResource as isAssetsResourceRecord,
  SYSTEM_VARIABLE_ID,
  systemParameter,
  type DataSources,
  type Resource,
  type DataSource,
  type Page,
  type PageTemplate,
} from "@webstudio-is/sdk";
import {
  generateObjectExpression,
  isLiteralExpression,
  parseObjectExpression,
} from "@webstudio-is/expression";
import {
  serializeValue,
  sitemapResourceUrl,
  currentDateResourceUrl,
  assetsResourceUrl,
} from "@webstudio-is/sdk/runtime";
import {
  Box,
  Flex,
  Grid,
  InputErrorsTooltip,
  InputField,
  Label,
  ProChip,
  Select,
  SmallIconButton,
  Text,
  TextArea,
  Tooltip,
  theme,
} from "@webstudio-is/design-system";
import { TrashIcon, InfoCircleIcon, PlusIcon } from "@webstudio-is/icons";
import { humanizeString } from "~/shared/string-utils";
import {
  $permissions,
  $selectedInstance,
  $selectedInstancePathWithRoot,
  $selectedPage,
  $variableValuesByInstanceSelector,
  getInstanceKey,
} from "~/shared/nano-states";
import { $dataSources, $resources } from "~/shared/sync/data-stores";
import { evaluateExpressionWithinScope } from "~/builder/shared/binding-popover";
import { BindableExpressionControl } from "~/builder/shared/bindable-expression";
import { ExpressionEditor } from "~/builder/shared/expression-editor";
import {
  EditorDialog,
  EditorDialogButton,
  EditorDialogControl,
} from "~/shared/code-editor-base";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import {
  createResourceFieldsFromFormData,
  validateResourceBodyExpression,
  validateResourceUrlExpression,
  type InstancePath,
  type ResourceBodyInputType,
} from "@webstudio-is/project-build/runtime";
import { parseCurl, type CurlRequest } from "./curl";
import { CenteredPanelMessage, Row } from "./shared";
const AssetQueryForm = lazy(() =>
  import("./asset-query-form").then(({ AssetQueryForm }) => ({
    default: AssetQueryForm,
  }))
);

export const UrlField = ({
  scope,
  aliases,
  value,
  onChange,
  onCurlPaste,
}: {
  aliases: Map<string, string>;
  scope: Record<string, unknown>;
  value: string;
  onChange: (
    urlExpression: string,
    searchParams?: Resource["searchParams"]
  ) => void;
  onCurlPaste: (curl: CurlRequest) => void;
}) => {
  const urlId = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState("");
  // revalidate and hide error message
  // until validity is checks again
  useEffect(() => {
    ref.current?.setCustomValidity(validateResourceUrlExpression(value, scope));
    setError("");
  }, [value, scope]);
  return (
    <Grid gap={1}>
      <Label
        htmlFor={urlId}
        css={{ display: "flex", alignItems: "center", gap: theme.spacing[3] }}
      >
        URL
        <Tooltip
          content="You can paste a URL or cURL. cURL is a format that can be executed directly in your terminal because it contains the entire Resource configuration."
          variant="wrapped"
          disableHoverableContent={true}
        >
          <InfoCircleIcon tabIndex={0} />
        </Tooltip>
      </Label>
      <input type="hidden" readOnly={true} name="url" value={value} />
      <BindableExpressionControl
        expression={value}
        value={String(evaluateExpressionWithinScope(value, scope))}
        bound={isLiteralExpression(value) === false}
        allowBindingOverwrite={false}
        scope={scope}
        aliases={aliases}
        onChangeValue={(value) => onChange(JSON.stringify(value))}
        onChangeExpression={onChange}
        onRemove={(value) => onChange(JSON.stringify(value))}
        renderControl={({ value, readOnly, onChangeValue }) => (
          <InputErrorsTooltip errors={error ? [error] : undefined}>
            <TextArea
              ref={ref}
              name="url-validator"
              id={urlId}
              rows={1}
              grow={true}
              disabled={readOnly}
              color={error ? "error" : undefined}
              value={value}
              onChange={(value) => {
                const curl = parseCurl(value);
                if (curl) {
                  onCurlPaste(curl);
                  return;
                }
                try {
                  const url = new URL(value);
                  if (url.searchParams.size > 0) {
                    const searchParams: Resource["searchParams"] = [];
                    for (const [name, value] of url.searchParams) {
                      searchParams.push({ name, value: JSON.stringify(value) });
                    }
                    // remove all search params from url
                    url.search = "";
                    // update text value as string literal
                    onChange(JSON.stringify(url.href), searchParams);
                    return;
                  }
                } catch {
                  // serialize without changes when url is invalid
                }
                onChangeValue(value);
              }}
              onBlur={(event) => event.currentTarget.checkValidity()}
              onInvalid={(event) =>
                setError(event.currentTarget.validationMessage)
              }
            />
          </InputErrorsTooltip>
        )}
      />
    </Grid>
  );
};

export const MethodField = ({
  value,
  onChange,
}: {
  value: Resource["method"];
  onChange: (value: Resource["method"]) => void;
}) => {
  return (
    <Grid gap={1}>
      <Label>Method</Label>
      <Select<Resource["method"]>
        options={["get", "post", "put", "delete"]}
        getLabel={humanizeString}
        name="method"
        value={value}
        onChange={onChange}
      />
    </Grid>
  );
};

const SearchParamPair = ({
  aliases,
  scope,
  name,
  value,
  onChange,
  onDelete,
}: {
  aliases: Map<string, string>;
  scope: Record<string, unknown>;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  onDelete: () => void;
}) => {
  const evaluatedValue = evaluateExpressionWithinScope(value, scope);
  const isValueString = typeof evaluatedValue === "string";
  return (
    <Grid
      gap={2}
      align="center"
      css={{ gridTemplateColumns: `120px 1fr min-content` }}
    >
      <InputField
        // autofocus only new fields
        autoFocus={name === ""}
        placeholder="Name"
        name="search-param-name"
        value={name}
        onChange={(event) => onChange(event.target.value, value)}
      />
      <input type="hidden" name="search-param-value" value={value} />
      <BindableExpressionControl
        expression={value}
        value={serializeValue(evaluatedValue)}
        bound={isLiteralExpression(value) === false}
        allowBindingOverwrite={false}
        scope={scope}
        aliases={aliases}
        onChangeValue={(value) => onChange(name, JSON.stringify(value))}
        onChangeExpression={(value) => onChange(name, value)}
        onRemove={(value) => onChange(name, JSON.stringify(value))}
        renderControl={({ value, readOnly, onChangeValue }) => (
          <InputField
            placeholder="Value"
            name="search-param-value-literal"
            disabled={readOnly || !isValueString}
            value={value}
            onChange={(event) => onChangeValue(event.target.value)}
          />
        )}
      />
      <SmallIconButton
        aria-label="Delete search param"
        variant="destructive"
        icon={<TrashIcon />}
        onClick={onDelete}
      />
    </Grid>
  );
};

export const SearchParams = ({
  scope,
  aliases,
  searchParams,
  onChange,
}: {
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  searchParams: NonNullable<Resource["searchParams"]>;
  onChange: (searchParams: NonNullable<Resource["searchParams"]>) => void;
}) => {
  return (
    <Grid gap={1}>
      <Flex justify="between" align="center">
        <Label>Search params</Label>
        <SmallIconButton
          aria-label="Add another search param"
          icon={<PlusIcon />}
          onClick={() => {
            // use empty string expression as default
            const newSearchParams = [
              ...searchParams,
              { name: "", value: `""` },
            ];
            onChange(newSearchParams);
          }}
        />
      </Flex>
      <Grid gap={2}>
        {searchParams.map((searchParam, index) => (
          <SearchParamPair
            key={index}
            scope={scope}
            aliases={aliases}
            name={searchParam.name}
            value={searchParam.value}
            onChange={(name, value) => {
              const newSearchParams = [...searchParams];
              newSearchParams[index] = { name, value };
              onChange(newSearchParams);
            }}
            onDelete={() => {
              const newSearchParams = [...searchParams];
              newSearchParams.splice(index, 1);
              onChange(newSearchParams);
            }}
          />
        ))}
        {searchParams.length === 0 && (
          <Text color="subtle" align="center">
            No search params
          </Text>
        )}
      </Grid>
    </Grid>
  );
};

const HeaderPair = ({
  aliases,
  scope,
  name,
  value,
  onChange,
  onDelete,
}: {
  aliases: Map<string, string>;
  scope: Record<string, unknown>;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  onDelete: () => void;
}) => {
  const evaluatedValue = evaluateExpressionWithinScope(value, scope);
  const isValueString = typeof evaluatedValue === "string";
  return (
    <Grid
      gap={2}
      align="center"
      css={{ gridTemplateColumns: `120px 1fr min-content` }}
    >
      <InputField
        // autofocus only new fields
        autoFocus={name === ""}
        placeholder="Name"
        name="header-name"
        value={name}
        onChange={(event) => onChange(event.target.value, value)}
      />
      <input type="hidden" readOnly={true} name="header-value" value={value} />
      <BindableExpressionControl
        expression={value}
        value={serializeValue(evaluatedValue)}
        bound={isLiteralExpression(value) === false}
        allowBindingOverwrite={false}
        scope={scope}
        aliases={aliases}
        onChangeValue={(value) => onChange(name, JSON.stringify(value))}
        onChangeExpression={(value) => onChange(name, value)}
        onRemove={(value) => onChange(name, JSON.stringify(value))}
        renderControl={({ value, readOnly, onChangeValue }) => (
          <InputField
            placeholder="Value"
            name="header-value-validator"
            disabled={readOnly || !isValueString}
            value={value}
            onChange={(event) => onChangeValue(event.target.value)}
          />
        )}
      />
      <SmallIconButton
        aria-label="Delete header"
        variant="destructive"
        icon={<TrashIcon />}
        onClick={onDelete}
      />
    </Grid>
  );
};

export const Headers = ({
  scope,
  aliases,
  headers,
  onChange,
}: {
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  headers: Resource["headers"];
  onChange: (headers: Resource["headers"]) => void;
}) => {
  return (
    <Grid gap={1}>
      <Flex justify="between" align="center">
        <Label>Headers</Label>
        <SmallIconButton
          aria-label="Add another search param"
          icon={<PlusIcon />}
          onClick={() => {
            // use empty string expression as default
            const newHeaders = [...headers, { name: "", value: `""` }];
            onChange(newHeaders);
          }}
        />
      </Flex>
      <Grid gap={2}>
        {headers.map((header, index) => (
          <HeaderPair
            key={index}
            scope={scope}
            aliases={aliases}
            name={header.name}
            value={header.value}
            onChange={(name, value) => {
              const newHeaders = [...headers];
              newHeaders[index] = { name, value };
              onChange(newHeaders);
            }}
            onDelete={() => {
              const newHeaders = [...headers];
              newHeaders.splice(index, 1);
              onChange(newHeaders);
            }}
          />
        ))}
        {headers.length === 0 && (
          <Text color="subtle" align="center">
            No headers
          </Text>
        )}
      </Grid>
    </Grid>
  );
};

const CacheMaxAge = ({
  value,
  onChange,
}: {
  value: undefined | string;
  onChange: (newValue: string) => void;
}) => {
  return (
    <Grid gap={1}>
      <Label htmlFor="resource-panel-max-age">Cache max age</Label>
      <InputField
        id="resource-panel-max-age"
        suffix={
          <Text variant="small" color="subtle" css={{ paddingInline: "2px" }}>
            S
          </Text>
        }
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <>
          <input type="hidden" name="header-name" value="Cache-Control" />
          <input
            type="hidden"
            name="header-value"
            value={`"max-age=${value}"`}
          />
        </>
      )}
    </Grid>
  );
};

export const getResourceScopeForInstance = ({
  page,
  instanceKey,
  dataSources,
  variableValuesByInstanceSelector,
}: {
  page: undefined | Page | PageTemplate;
  instanceKey: undefined | string;
  dataSources: DataSources;
  variableValuesByInstanceSelector: Map<string, Map<string, unknown>>;
}) => {
  const scope: Record<string, unknown> = {};
  const aliases = new Map<string, string>();
  const variableValues = new Map<DataSource["id"], unknown>();
  const hiddenDataSourceIds = new Set<DataSource["id"]>();
  for (const dataSource of dataSources.values()) {
    // Hide collection/component parameters from resource expressions. They are
    // internal scoped runtime values, and exposing them here would invite
    // request waterfalls/loops and complicate generated resource code.
    if (dataSource.type === "parameter") {
      hiddenDataSourceIds.add(dataSource.id);
    }
    // prevent resources using data of other resources
    if (dataSource.type === "resource") {
      hiddenDataSourceIds.add(dataSource.id);
    }
  }
  if (page?.systemDataSourceId) {
    hiddenDataSourceIds.delete(page.systemDataSourceId);
  }
  const values = variableValuesByInstanceSelector.get(instanceKey ?? "");
  if (values) {
    for (const [dataSourceId, value] of values) {
      if (hiddenDataSourceIds.has(dataSourceId)) {
        continue;
      }
      let dataSource = dataSources.get(dataSourceId);
      if (dataSourceId === SYSTEM_VARIABLE_ID) {
        dataSource = systemParameter;
      }
      if (dataSource) {
        const name = encodeDataVariableId(dataSourceId);
        scope[name] = value;
        aliases.set(name, dataSource.name);
        variableValues.set(dataSourceId, value);
      }
    }
  }
  return { variableValues, scope, aliases };
};

const getVariableInstanceKey = ({
  variable,
  instancePath,
}: {
  variable: undefined | DataSource;
  instancePath: undefined | InstancePath;
}) => {
  if (instancePath === undefined) {
    return;
  }
  // find instance key for variable instance
  for (const { instance, instanceSelector } of instancePath) {
    if (instance.id === variable?.scopeInstanceId) {
      return getInstanceKey(instanceSelector);
    }
  }
  // and fallback to currently selected instance
  return getInstanceKey(instancePath[0].instanceSelector);
};

export const useResourceScope = ({ variable }: { variable?: DataSource }) => {
  return useStore(
    useMemo(
      () =>
        computed(
          [
            $selectedPage,
            $selectedInstancePathWithRoot,
            $variableValuesByInstanceSelector,
            $dataSources,
          ],
          (
            page,
            instancePath,
            variableValuesByInstanceSelector,
            dataSources
          ) => {
            const { scope, aliases, variableValues } =
              getResourceScopeForInstance({
                page,
                instanceKey: getVariableInstanceKey({
                  variable,
                  instancePath,
                }),
                dataSources,
                variableValuesByInstanceSelector,
              });
            // prevent showing currently edited variable in suggestions
            // to avoid cirular dependeny
            const newScope = { ...scope };
            const newAliases = new Map(aliases);
            const newVariableValues = new Map(variableValues);
            if (variable) {
              const key = encodeDataVariableId(variable.id);
              delete newScope[key];
              newAliases.delete(key);
              newVariableValues.delete(variable.id);
            }
            return {
              scope: newScope,
              aliases: newAliases,
              variableValues: newVariableValues,
            };
          }
        ),
      [variable]
    )
  );
};

type PanelApi = {
  save: (formData: FormData) => void | false;
};

type BodyType = ResourceBodyInputType;

const toMime = (bodyType: BodyType) => {
  if (bodyType === "json") {
    return "application/json";
  }
  if (bodyType === "text") {
    return "text/plain";
  }
};

const BodyField = ({
  scope,
  aliases,
  bodyType,
  value,
  onChange,
}: {
  aliases: Map<string, string>;
  scope: Record<string, unknown>;
  bodyType: BodyType;
  value: string;
  onChange: (value: string, bodyType: BodyType) => void;
}) => {
  const [isBodyLiteral, setIsBodyLiteral] = useState(
    () => value === "" || isLiteralExpression(value)
  );
  const [bodyError, setBodyError] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    bodyRef.current?.setCustomValidity(
      validateResourceBodyExpression(value, bodyType, scope)
    );
    setBodyError("");
  }, [value, bodyType, scope]);
  const updateBody = (newBody: string) => {
    const evaluatedValue = evaluateExpressionWithinScope(newBody, scope);
    // automatically add Content-Type: application/json header
    // when value is object
    const isBodyObject =
      typeof evaluatedValue === "object" && evaluatedValue !== null;
    onChange(newBody, isBodyObject ? "json" : bodyType);
  };
  const displayedValue =
    bodyType === "json"
      ? isBodyLiteral
        ? value
        : (JSON.stringify(
            evaluateExpressionWithinScope(value, scope),
            null,
            2
          ) ?? "")
      : String(evaluateExpressionWithinScope(value, scope) ?? "");

  return (
    <Grid gap={1}>
      <Label>Body</Label>
      <Select<BodyType | "">
        placeholder="Type"
        value={bodyType ?? ""}
        options={["text", "json"]}
        onChange={(newBodyType) => {
          if (newBodyType) {
            onChange(value, newBodyType);
          }
        }}
      />
      {bodyType && (
        <>
          <input type="hidden" name="header-name" value="Content-Type" />
          <input
            type="hidden"
            name="header-value"
            value={`"${toMime(bodyType)}"`}
          />
        </>
      )}
      <textarea
        ref={bodyRef}
        style={{ display: "none" }}
        name="body"
        data-color={bodyError ? "error" : undefined}
        value={value}
        onChange={() => {}}
        onInvalid={(event) =>
          setBodyError(event.currentTarget.validationMessage)
        }
      />
      <BindableExpressionControl
        expression={value}
        value={displayedValue}
        bound={isBodyLiteral === false}
        allowBindingOverwrite={false}
        scope={scope}
        aliases={aliases}
        parseValue={(value) =>
          bodyType === "json" ? evaluateExpressionWithinScope(value, {}) : value
        }
        onChangeValue={(value) =>
          updateBody(bodyType === "json" ? value : JSON.stringify(value))
        }
        onChangeExpression={(value) => {
          updateBody(value);
          setIsBodyLiteral(isLiteralExpression(value));
        }}
        onRemove={(value) => {
          updateBody(JSON.stringify(value));
          setIsBodyLiteral(true);
        }}
        renderControl={({ value, readOnly, onChangeValue }) => (
          <InputErrorsTooltip errors={bodyError ? [bodyError] : undefined}>
            {bodyType === "json" ? (
              // wrap with div to position error tooltip
              <div>
                <ExpressionEditor
                  color={bodyError ? "error" : undefined}
                  readOnly={readOnly}
                  value={value}
                  onChange={onChangeValue}
                  onChangeComplete={() => bodyRef.current?.checkValidity()}
                />
              </div>
            ) : (
              <TextArea
                autoGrow={true}
                maxRows={10}
                disabled={readOnly}
                color={bodyError ? "error" : undefined}
                value={value}
                onChange={onChangeValue}
                onBlur={() => bodyRef.current?.checkValidity()}
              />
            )}
          </InputErrorsTooltip>
        )}
      />
    </Grid>
  );
};

const isCacheControl = (name: string) => name.toLowerCase() === "cache-control";
const isContentType = (name: string) => name.toLowerCase() === "content-type";

const parseHeaders = (headers: Resource["headers"]) => {
  let maxAge: undefined | string;
  let bodyType: BodyType;
  const newHeaders = headers.filter((header) => {
    // cast raw expression result to string
    const value = String(
      evaluateExpressionWithinScope(header.value, {})
    ).toLowerCase();
    if (isCacheControl(header.name)) {
      // move simple header like Cache-Control: max-age=10 to dedicated input
      // preserve more complex cache-control
      const matched = value.match(/^max-age=(\d+)$/);
      if (matched) {
        [, maxAge] = matched;
        return false;
      }
    }
    // store json and text in dedicated input
    // and preserve other types
    if (isContentType(header.name)) {
      if (value === "application/json") {
        bodyType = "json";
        return false;
      }
      if (value === "text/plain") {
        bodyType = "text";
        return false;
      }
    }
    return true;
  });
  return { headers: newHeaders, maxAge, bodyType };
};

export const ResourceForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource }
>(({ variable }, ref) => {
  const { scope, aliases } = useResourceScope({ variable });

  const resources = useStore($resources);
  const resource =
    variable?.type === "resource"
      ? resources.get(variable.resourceId)
      : undefined;
  const parsedHeaders = parseHeaders(resource?.headers ?? []);

  const [url, setUrl] = useState(resource?.url ?? `""`);
  const [method, setMethod] = useState<Resource["method"]>(
    resource?.method ?? "get"
  );
  const [searchParams, setSearchParams] = useState(
    resource?.searchParams ?? []
  );
  const [headers, setHeaders] = useState<Resource["headers"]>(
    parsedHeaders.headers
  );
  const [maxAge, setMaxAge] = useState(parsedHeaders.maxAge);
  const [bodyType, setBodyType] = useState(parsedHeaders.bodyType);
  const [body, setBody] = useState(resource?.body);

  useImperativeHandle(ref, () => ({
    save: (formData) => {
      // preserve existing instance scope when edit
      const scopeInstanceId =
        variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
      if (scopeInstanceId === undefined) {
        return;
      }
      const resourceFields = createResourceFieldsFromFormData({ formData });
      executeRuntimeMutation({
        id: "resources.upsert",
        input: {
          resourceId: resource?.id,
          resource: resourceFields,
          dataSourceId: variable?.id,
          scopeInstanceId,
          dataSourceName: resourceFields.name,
        },
      });
    },
  }));

  return (
    <>
      <Row>
        <MethodField value={method} onChange={setMethod} />
      </Row>
      <Row>
        <UrlField
          scope={scope}
          aliases={aliases}
          value={url}
          onChange={(urlExpression, searchParams) => {
            setUrl(urlExpression);
            if (searchParams) {
              setSearchParams((prev) => [...prev, ...searchParams]);
            }
          }}
          onCurlPaste={(curl) => {
            // update all feilds when curl is paste into url field
            setMethod(curl.method);
            setUrl(JSON.stringify(curl.url));
            setSearchParams(
              (curl.searchParams ?? []).map((header) => ({
                name: header.name,
                value: JSON.stringify(header.value),
              }))
            );
            const parsedHeaders = parseHeaders(
              curl.headers.map((header) => ({
                name: header.name,
                value: JSON.stringify(header.value),
              }))
            );
            setMaxAge(parsedHeaders.maxAge);
            setHeaders(parsedHeaders.headers);
            setBodyType(parsedHeaders.bodyType);
            setBody(JSON.stringify(curl.body));
          }}
        />
      </Row>
      <Row>
        <SearchParams
          scope={scope}
          aliases={aliases}
          searchParams={searchParams}
          onChange={setSearchParams}
        />
      </Row>
      <Row>
        <CacheMaxAge
          value={maxAge}
          onChange={(newMaxAge) => {
            setMaxAge(newMaxAge);
            // reset header
            setHeaders((headers) =>
              headers.filter(({ name }) => !isCacheControl(name))
            );
          }}
        />
      </Row>
      <Row>
        <Headers
          scope={scope}
          aliases={aliases}
          headers={headers}
          onChange={(newHeaders) => {
            // reset dedicated fields
            if (newHeaders.some(({ name }) => isCacheControl(name))) {
              setMaxAge(undefined);
            }
            if (newHeaders.some(({ name }) => isContentType(name))) {
              setBodyType(undefined);
            }
            setHeaders(newHeaders);
          }}
        />
      </Row>
      {method !== "get" && (
        <Row>
          <BodyField
            scope={scope}
            aliases={aliases}
            value={body ?? ""}
            bodyType={bodyType}
            onChange={(newBody, newBodyType) => {
              setBodyType(newBodyType);
              // reset header
              if (newBodyType) {
                setHeaders((headers) =>
                  headers.filter(({ name }) => !isContentType(name))
                );
              }
              setBody(newBody);
            }}
          />
        </Row>
      )}
    </>
  );
});
ResourceForm.displayName = "ResourceForm";

export const SystemResourceForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource }
>(({ variable }, ref) => {
  const { scope, aliases } = useResourceScope({ variable });
  const resources = useStore($resources);
  const { allowDynamicData } = useStore($permissions);

  const resource =
    variable?.type === "resource"
      ? resources.get(variable.resourceId)
      : undefined;
  const isStoredAssetQuery =
    resource !== undefined && isAssetsResourceRecord(resource);

  const assetsLocalResource = {
    label: "Assets",
    value: JSON.stringify(assetsResourceUrl),
    description:
      "Loads all project assets by default, with optional filters, sorting, pagination, and file content.",
  };
  const localResources = [
    {
      label: "Sitemap",
      value: JSON.stringify(sitemapResourceUrl),
      description: "Resource that loads the sitemap data of the current site.",
    },
    {
      label: "Current date",
      value: JSON.stringify(currentDateResourceUrl),
      description:
        "Provides current date information (year, month, day) normalized to midnight UTC. Time components are set to 00:00:00 to prevent React hydration errors.",
    },
    assetsLocalResource,
  ];

  const [localResource, setLocalResource] = useState(() => {
    if (isStoredAssetQuery) {
      return assetsLocalResource;
    }
    return (
      localResources.find(
        (localResource) => localResource.value === resource?.url
      ) ?? localResources[0]
    );
  });
  const isAssetsResource =
    localResource.value === JSON.stringify(assetsResourceUrl);
  useImperativeHandle(ref, () => ({
    save: (formData) => {
      if (formData.get("asset-query-valid") === "false") {
        return false;
      }
      // preserve existing instance scope when edit
      const scopeInstanceId =
        variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
      if (scopeInstanceId === undefined) {
        return;
      }
      const resourceFields = createResourceFieldsFromFormData({
        control: "system",
        formData,
      });
      executeRuntimeMutation({
        id: "resources.upsert",
        input: {
          resourceId: resource?.id,
          resource: resourceFields,
          dataSourceId: variable?.id,
          scopeInstanceId,
          dataSourceName: resourceFields.name,
        },
      });
    },
  }));

  const resourceId = useId();

  return (
    <>
      <input
        type="hidden"
        name="method"
        value={isAssetsResource ? "post" : "get"}
      />
      <input type="hidden" name="url" value={localResource.value} />
      <Row>
        <Grid gap={1}>
          <Label htmlFor={resourceId}>Resource</Label>
          <Select
            options={localResources}
            getLabel={(option) => (
              <Flex direction="row" gap="2" align="center">
                {option.label}
                {option.value === assetsLocalResource.value &&
                  allowDynamicData === false && <ProChip>Pro</ProChip>}
              </Flex>
            )}
            getValue={(option) => option.value}
            getDescription={(option) => {
              return (
                <Box css={{ width: theme.spacing[25] }}>
                  {option?.description}
                </Box>
              );
            }}
            value={localResource}
            onChange={setLocalResource}
          />
        </Grid>
      </Row>
      {isAssetsResource && (
        <Suspense
          fallback={
            <CenteredPanelMessage>Loading query editor…</CenteredPanelMessage>
          }
        >
          <AssetQueryForm resource={resource} scope={scope} aliases={aliases} />
        </Suspense>
      )}
    </>
  );
});
SystemResourceForm.displayName = "SystemResourceForm";

const zGraphqlBody = z.object({
  query: z.string(),
  variables: z.optional(z.record(z.string(), z.unknown())),
});

export const GraphqlResourceForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource }
>(({ variable }, ref) => {
  const { scope, aliases } = useResourceScope({ variable });

  const resources = useStore($resources);
  const resource =
    variable?.type === "resource"
      ? resources.get(variable.resourceId)
      : undefined;

  const [url, setUrl] = useState(resource?.url ?? `""`);
  const parsedHeaders = parseHeaders(resource?.headers ?? []);
  const [maxAge, setMaxAge] = useState(parsedHeaders.maxAge);
  const [headers, setHeaders] = useState(parsedHeaders.headers);

  const [bodyExpressions] = useState(() =>
    parseObjectExpression(resource?.body ?? "")
  );
  const queryId = useId();
  const [query, setQuery] = useState(
    () =>
      evaluateExpressionWithinScope(bodyExpressions.get("query") ?? "", {}) ??
      ""
  );
  const [variables, setVariables] = useState(
    () => bodyExpressions.get("variables") ?? "{}"
  );
  const [isVariablesLiteral, setIsVariablesLiteral] = useState(() =>
    isLiteralExpression(variables)
  );
  const [variablesError, setVariablesError] = useState("");
  const variablesRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const evaluatedValue = evaluateExpressionWithinScope(variables, scope);
    variablesRef.current?.setCustomValidity(
      typeof evaluatedValue === "object" && evaluatedValue !== null
        ? ""
        : "Expected valid JSON object in GraphQL variables"
    );
    setVariablesError("");
  }, [variables, scope]);

  useImperativeHandle(ref, () => ({
    save: (formData) => {
      // preserve existing instance scope when edit
      const scopeInstanceId =
        variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
      if (scopeInstanceId === undefined) {
        return;
      }
      const resourceFields = createResourceFieldsFromFormData({
        control: "graphql",
        formData,
      });
      executeRuntimeMutation({
        id: "resources.upsert",
        input: {
          resourceId: resource?.id,
          resource: resourceFields,
          dataSourceId: variable?.id,
          scopeInstanceId,
          dataSourceName: resourceFields.name,
        },
      });
    },
  }));

  return (
    <>
      <input type="hidden" name="method" value="post" />
      {!headers.some(({ name }) => isContentType(name)) && (
        <>
          <input type="hidden" name="header-name" value="Content-Type" />
          <input
            type="hidden"
            name="header-value"
            value={`"application/json"`}
          />
        </>
      )}
      <input
        type="hidden"
        name="body"
        value={generateObjectExpression(
          new Map([
            ["query", JSON.stringify(query)],
            ["variables", variables],
          ])
        )}
      />

      <Row>
        <UrlField
          scope={scope}
          aliases={aliases}
          value={url}
          onChange={setUrl}
          onCurlPaste={(curl) => {
            // update all feilds when curl is paste into url field
            setUrl(JSON.stringify(curl.url));
            const parsedHeaders = parseHeaders(
              curl.headers.map((header) => ({
                name: header.name,
                value: JSON.stringify(header.value),
              }))
            );
            setMaxAge(parsedHeaders.maxAge);
            setHeaders(parsedHeaders.headers);
            const body = zGraphqlBody.safeParse(curl.body);
            if (body.success) {
              setQuery(body.data.query);
              setVariables(JSON.stringify(body.data.variables, null, 2));
            }
          }}
        />
      </Row>

      <Row>
        <Grid gap={1}>
          <Label htmlFor={queryId}>Query</Label>
          <EditorDialogControl>
            <TextArea
              name="query"
              id={queryId}
              rows={3}
              maxRows={10}
              autoGrow={true}
              value={query}
              onChange={setQuery}
            />
            <EditorDialog
              title="GraphQL Query"
              content={
                <TextArea grow={true} value={query} onChange={setQuery} />
              }
            >
              <EditorDialogButton />
            </EditorDialog>
          </EditorDialogControl>
        </Grid>
      </Row>

      <Row>
        <Grid gap={1}>
          <Label>GraphQL variables</Label>
          {/* use invisible text input to reflect expression editor in form
            type=hidden does not emit invalid event */}
          <input
            ref={variablesRef}
            style={{ display: "none" }}
            type="text"
            name="variables"
            data-color={variablesError ? "error" : undefined}
            value={variables}
            onChange={() => {}}
            onInvalid={(event) =>
              setVariablesError(event.currentTarget.validationMessage)
            }
          />
          <BindableExpressionControl
            expression={variables}
            value={
              isVariablesLiteral
                ? variables
                : (JSON.stringify(
                    evaluateExpressionWithinScope(variables, scope),
                    null,
                    2
                  ) ?? "")
            }
            bound={isVariablesLiteral === false}
            allowBindingOverwrite={false}
            scope={scope}
            aliases={aliases}
            parseValue={(value) => evaluateExpressionWithinScope(value, {})}
            onChangeValue={setVariables}
            onChangeExpression={(value) => {
              setVariables(value);
              setIsVariablesLiteral(isLiteralExpression(value));
            }}
            onRemove={(value) => {
              setVariables(JSON.stringify(value));
              setIsVariablesLiteral(true);
            }}
            renderControl={({ value, readOnly, onChangeValue }) => (
              <InputErrorsTooltip
                errors={variablesError ? [variablesError] : undefined}
              >
                {/* wrap with div to position error tooltip */}
                <div>
                  <ExpressionEditor
                    color={variablesError ? "error" : undefined}
                    readOnly={readOnly}
                    value={value}
                    onChange={onChangeValue}
                    onChangeComplete={() =>
                      variablesRef.current?.checkValidity()
                    }
                  />
                </div>
              </InputErrorsTooltip>
            )}
          />
        </Grid>
      </Row>

      <Row>
        <CacheMaxAge
          value={maxAge}
          onChange={(newMaxAge) => {
            setMaxAge(newMaxAge);
            setHeaders((headers) =>
              headers.filter(({ name }) => !isCacheControl(name))
            );
          }}
        />
      </Row>

      <Row>
        <Headers
          scope={scope}
          aliases={aliases}
          headers={headers}
          onChange={(newHeaders) => {
            // reset dedicated fields
            if (newHeaders.some(({ name }) => isCacheControl(name))) {
              setMaxAge(undefined);
            }
            setHeaders(newHeaders);
          }}
        />
      </Row>
    </>
  );
});
GraphqlResourceForm.displayName = "GraphqlResourceForm";
