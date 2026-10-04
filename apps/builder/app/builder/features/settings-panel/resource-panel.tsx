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
  decodeDataVariableId,
  getDefaultFormEmailBodyExpression,
  defaultEmailBody,
  getResourceCycleDataSourceIds,
  isAssetsResource as isAssetsResourceRecord,
  SYSTEM_VARIABLE_ID,
  systemParameter,
  type DataSources,
  type Resource,
  type EmailResourceSettings,
  type DataSource,
  type Page,
  type PageTemplate,
} from "@webstudio-is/sdk";
import {
  generateObjectExpression,
  getExpressionIdentifiers,
  isLiteralExpression,
  parseStringLiteralExpression,
  parseExpressionObject,
} from "@webstudio-is/expression";
import {
  browserInfoParameterName,
  formDataParameterName,
  serializeValue,
  sitemapResourceUrl,
  currentDateResourceUrl,
  assetsResourceUrl,
  getResourceBodyFormatError,
} from "@webstudio-is/sdk/runtime";
import {
  Box,
  Button,
  Combobox,
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
  cssVar,
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
import {
  $dataSources,
  $resources,
  $projectSettings,
} from "~/shared/sync/data-stores";
import { evaluateExpressionWithinScope } from "~/builder/shared/binding-popover";
import { BindableExpressionControl } from "~/builder/shared/bindable-expression";
import { ExpressionEditor } from "~/builder/shared/expression-editor";
import {
  EditorDialog,
  EditorDialogButton,
  EditorDialogControl,
} from "~/shared/code-editor-base";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { invalidateAssets } from "~/shared/resources";
import { useAsyncValue } from "~/shared/use-async-value";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import {
  createResourceFieldsFromFormData,
  getExpressionErrorMessages,
  getResourceExpressionErrors,
  validateResourceBodyExpression,
  validateResourceUrlExpression,
  type InstancePath,
  type ResourceBodyInputType,
} from "@webstudio-is/project-build/runtime";
import {
  validateContactEmail,
  validateEmailSender,
} from "@webstudio-is/project-build/contracts";
import { parseCurl, type CurlRequest } from "./curl";
import {
  getRequestHeaderValueSuggestions,
  requestHeaderNames,
} from "./request-header-suggestions";
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
  autoFocus,
}: {
  aliases: Map<string, string>;
  scope: Record<string, unknown>;
  value: string;
  onChange: (
    urlExpression: string,
    searchParams?: Resource["searchParams"]
  ) => void;
  onCurlPaste: (curl: CurlRequest) => void;
  autoFocus?: boolean;
}) => {
  const urlId = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState("");
  // revalidate and hide error message
  // until validity is checks again
  useEffect(() => {
    void validateResourceUrlExpression(value, scope).then((error) => {
      ref.current?.setCustomValidity(error);
    });
    setError("");
  }, [value, scope]);
  const evaluatedValue = useAsyncValue(
    () => evaluateExpressionWithinScope(value, scope),
    [scope, value],
    undefined
  );
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
          <InfoCircleIcon
            color={cssVar("--foreground-secondary")}
            tabIndex={0}
          />
        </Tooltip>
      </Label>
      <input type="hidden" readOnly={true} name="url" value={value} />
      <BindableExpressionControl
        expression={value}
        value={String(evaluatedValue ?? "")}
        bound={isLiteralExpression(value) === false}
        scope={scope}
        aliases={aliases}
        onChangeValue={(value) => onChange(JSON.stringify(value))}
        onChangeExpression={onChange}
        onRemove={(value) => onChange(JSON.stringify(value))}
        renderControl={({ value, readOnly, onChangeValue }) => (
          <InputErrorsTooltip errors={error ? [error] : undefined}>
            <TextArea
              ref={ref}
              autoFocus={autoFocus}
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

type ExpressionPair = Resource["headers"][number];

const ExpressionNameValuePair = ({
  aliases,
  scope,
  kind,
  name,
  value,
  onChange,
  onDelete,
  suggestHeaders,
  autoFocusName,
}: {
  aliases: Map<string, string>;
  scope: Record<string, unknown>;
  kind: "header" | "search param";
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  onDelete: () => void;
  suggestHeaders?: boolean;
  autoFocusName: boolean;
}) => {
  const evaluatedValue = useAsyncValue(
    () => evaluateExpressionWithinScope(value, scope),
    [scope, value],
    undefined
  );
  const isValueString = typeof evaluatedValue === "string";
  const valueSuggestions =
    kind === "header" && suggestHeaders
      ? getRequestHeaderValueSuggestions(name)
      : [];
  return (
    <Grid
      gap={2}
      align="center"
      css={{ gridTemplateColumns: `120px 1fr min-content` }}
    >
      {kind === "header" && suggestHeaders ? (
        <Combobox<string>
          modal={false}
          autoFocus={autoFocusName}
          placeholder="Name"
          name="header-name"
          value={name}
          getItems={() => [...requestHeaderNames]}
          itemToString={(item) => item ?? ""}
          onItemSelect={(selected) => onChange(selected, value)}
          onChange={(nextName) => {
            if (nextName !== undefined) {
              onChange(nextName, value);
            }
          }}
        />
      ) : (
        <InputField
          // autofocus only new fields
          autoFocus={autoFocusName}
          placeholder="Name"
          name={kind === "header" ? "header-name" : "search-param-name"}
          value={name}
          onChange={(event) => onChange(event.target.value, value)}
        />
      )}
      <input
        type="hidden"
        readOnly={true}
        name={kind === "header" ? "header-value" : "search-param-value"}
        value={value}
      />
      <BindableExpressionControl
        expression={value}
        value={serializeValue(evaluatedValue) ?? ""}
        bound={isLiteralExpression(value) === false}
        scope={scope}
        aliases={aliases}
        onChangeValue={(value) => onChange(name, JSON.stringify(value))}
        onChangeExpression={(value) => onChange(name, value)}
        onRemove={(value) => onChange(name, JSON.stringify(value))}
        renderControl={({ value, readOnly, onChangeValue }) =>
          valueSuggestions.length > 0 ? (
            <Combobox<string>
              modal={false}
              placeholder="Value"
              name="header-value-validator"
              disabled={readOnly || !isValueString}
              value={value}
              getItems={() => [...valueSuggestions]}
              itemToString={(item) => item ?? ""}
              onItemSelect={onChangeValue}
              onChange={(nextValue) => {
                if (nextValue !== undefined) {
                  onChangeValue(nextValue);
                }
              }}
            />
          ) : (
            <InputField
              placeholder="Value"
              name={
                kind === "header"
                  ? "header-value-validator"
                  : "search-param-value-literal"
              }
              disabled={readOnly || !isValueString}
              value={value}
              onChange={(event) => onChangeValue(event.target.value)}
            />
          )
        }
      />
      <SmallIconButton
        aria-label={`Delete ${kind}`}
        variant="destructive"
        icon={<TrashIcon />}
        onClick={onDelete}
      />
    </Grid>
  );
};

const ExpressionPairs = ({
  scope,
  aliases,
  kind,
  values,
  onChange,
  suggestHeaders,
}: {
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  kind: "header" | "search param";
  values: ExpressionPair[];
  onChange: (values: ExpressionPair[]) => void;
  suggestHeaders?: boolean;
}) => {
  const label = kind === "header" ? "Headers" : "Search params";
  const hasMounted = useRef(false);
  useEffect(() => {
    hasMounted.current = true;
  }, []);
  return (
    <Grid gap={1}>
      <Flex justify="between" align="center">
        <Label>{label}</Label>
        <SmallIconButton
          aria-label={`Add another ${kind}`}
          icon={<PlusIcon />}
          // Use an empty string expression as the default value.
          onClick={() => onChange([...values, { name: "", value: `""` }])}
        />
      </Flex>
      <Grid gap={2}>
        {values.map((item, index) => (
          <ExpressionNameValuePair
            key={index}
            scope={scope}
            aliases={aliases}
            kind={kind}
            suggestHeaders={suggestHeaders}
            autoFocusName={
              item.name === "" && (!suggestHeaders || hasMounted.current)
            }
            name={item.name}
            value={item.value}
            onChange={(name, value) => {
              const next = [...values];
              next[index] = { name, value };
              onChange(next);
            }}
            onDelete={() =>
              onChange(values.filter((_, position) => position !== index))
            }
          />
        ))}
        {values.length === 0 && (
          <Text color="subtle" align="center">
            No {label.toLowerCase()}
          </Text>
        )}
      </Grid>
    </Grid>
  );
};

export const SearchParams = ({
  searchParams,
  ...props
}: {
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  searchParams: NonNullable<Resource["searchParams"]>;
  onChange: (searchParams: NonNullable<Resource["searchParams"]>) => void;
}) => <ExpressionPairs {...props} kind="search param" values={searchParams} />;

export const Headers = ({
  headers,
  ...props
}: {
  aliases: Map<string, string>;
  scope: Record<string, unknown>;
  headers: Resource["headers"];
  onChange: (headers: Resource["headers"]) => void;
  suggestHeaders?: boolean;
}) => <ExpressionPairs {...props} kind="header" values={headers} />;

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
  includeResourceDataSources = false,
  formScopeInstanceId,
}: {
  page: undefined | Page | PageTemplate;
  instanceKey: undefined | string;
  dataSources: DataSources;
  variableValuesByInstanceSelector: Map<string, Map<string, unknown>>;
  includeResourceDataSources?: boolean;
  formScopeInstanceId?: string;
}) => {
  const scope: Record<string, unknown> = {};
  const aliases = new Map<string, string>();
  const variableValues = new Map<DataSource["id"], unknown>();
  const hiddenDataSourceIds = new Set<DataSource["id"]>();
  for (const dataSource of dataSources.values()) {
    // Hide collection/component parameters from resource expressions. They are
    // internal scoped runtime values, and exposing them here would invite
    // request waterfalls/loops and complicate generated resource code.
    if (
      dataSource.type === "parameter" &&
      !(
        dataSource.scopeInstanceId === formScopeInstanceId &&
        (dataSource.name === formDataParameterName ||
          dataSource.name === browserInfoParameterName)
      )
    ) {
      hiddenDataSourceIds.add(dataSource.id);
    }
    if (
      dataSource.type === "resource" &&
      includeResourceDataSources === false
    ) {
      hiddenDataSourceIds.add(dataSource.id);
    }
  }
  if (page?.systemDataSourceId) {
    hiddenDataSourceIds.delete(page.systemDataSourceId);
  }
  if (formScopeInstanceId) {
    for (const dataSource of dataSources.values()) {
      if (
        dataSource.type !== "parameter" ||
        dataSource.scopeInstanceId !== formScopeInstanceId ||
        (dataSource.name !== formDataParameterName &&
          dataSource.name !== browserInfoParameterName)
      ) {
        continue;
      }
      const name = encodeDataVariableId(dataSource.id);
      const value =
        dataSource.name === formDataParameterName
          ? {}
          : {
              ip: "",
              userAgent: "",
              language: "",
              referrer: "",
            };
      scope[name] = value;
      aliases.set(name, dataSource.name);
      variableValues.set(dataSource.id, value);
    }
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
        if (
          dataSource.type === "parameter" &&
          dataSource.scopeInstanceId === formScopeInstanceId &&
          (dataSource.name === formDataParameterName ||
            dataSource.name === browserInfoParameterName)
        ) {
          continue;
        }
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
            $resources,
          ],
          (
            page,
            instancePath,
            variableValuesByInstanceSelector,
            dataSources,
            resources
          ) => {
            const variablePathIndex =
              variable === undefined
                ? 0
                : (instancePath?.findIndex(
                    ({ instance }) => instance.id === variable.scopeInstanceId
                  ) ?? -1);
            const formScopeInstanceId =
              variablePathIndex < 0
                ? undefined
                : instancePath
                    ?.slice(variablePathIndex)
                    .find(({ instance }) => instance.component === "NativeForm")
                    ?.instance.id;
            const { scope, aliases, variableValues } =
              getResourceScopeForInstance({
                page,
                instanceKey: getVariableInstanceKey({
                  variable,
                  instancePath,
                }),
                dataSources,
                variableValuesByInstanceSelector,
                includeResourceDataSources: true,
                formScopeInstanceId,
              });
            // Prevent showing dependencies that would create a cycle.
            const newScope = { ...scope };
            const newAliases = new Map(aliases);
            const newVariableValues = new Map(variableValues);
            if (variable) {
              const hiddenDataSourceIds =
                variable.type === "resource"
                  ? getResourceCycleDataSourceIds({
                      resourceDataSource: variable,
                      resources,
                      dataSources,
                    })
                  : [variable.id];
              for (const dataSourceId of hiddenDataSourceIds) {
                const key = encodeDataVariableId(dataSourceId);
                delete newScope[key];
                newAliases.delete(key);
                newVariableValues.delete(dataSourceId);
              }
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
  save: (formData: FormData) => void | false | { dataSourceId: string };
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
  bodyFormat,
  value,
  onChangeStart,
  onChange,
}: {
  aliases: Map<string, string>;
  scope: Record<string, unknown>;
  bodyType: BodyType;
  bodyFormat: Resource["bodyFormat"];
  value: string;
  onChangeStart?: () => void;
  onChange: (value: string, bodyType: BodyType) => void;
}) => {
  const [isBodyLiteral, setIsBodyLiteral] = useState(
    () => value === "" || isLiteralExpression(value)
  );
  const [bodyError, setBodyError] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const effectiveBodyType = bodyFormat === "auto" ? bodyType : "json";
  useEffect(() => {
    let canceled = false;
    void validateResourceBodyExpression(value, effectiveBodyType, scope).then(
      async (error) => {
        let validationError: string = error;
        if (error === "" && value !== "" && bodyFormat !== "auto") {
          const body = await evaluateExpressionWithinScope(value, scope);
          validationError =
            getResourceBodyFormatError({
              name: "",
              method: "post",
              url: "",
              searchParams: [],
              headers: [],
              body,
              bodyFormat,
            }) ?? "";
        }
        if (!canceled) {
          bodyRef.current?.setCustomValidity(validationError);
        }
      }
    );
    setBodyError("");
    return () => {
      canceled = true;
    };
  }, [value, effectiveBodyType, bodyFormat, scope]);
  const evaluatedValue = useAsyncValue(
    () => evaluateExpressionWithinScope(value, scope),
    [scope, value],
    undefined
  );
  const updateBody = async (newBody: string) => {
    onChangeStart?.();
    const evaluatedValue = await evaluateExpressionWithinScope(newBody, scope);
    // automatically add Content-Type: application/json header
    // when value is object
    const isBodyObject =
      typeof evaluatedValue === "object" && evaluatedValue !== null;
    onChange(newBody, isBodyObject ? "json" : bodyType);
  };
  const displayedValue =
    effectiveBodyType === "json"
      ? isBodyLiteral
        ? value
        : (JSON.stringify(evaluatedValue, null, 2) ?? "")
      : String(evaluatedValue ?? "");

  return (
    <Grid gap={1}>
      <Label>Body</Label>
      {bodyFormat === "auto" && (
        <Select<BodyType | "">
          placeholder="Type"
          value={bodyType ?? ""}
          options={["text", "json"]}
          onChange={(newBodyType) => {
            if (newBodyType) {
              onChangeStart?.();
              onChange(value, newBodyType);
            }
          }}
        />
      )}
      {bodyFormat === "auto" && bodyType && (
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
        scope={scope}
        aliases={aliases}
        onChangeValue={(value) =>
          updateBody(
            effectiveBodyType === "json" ? value : JSON.stringify(value)
          )
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
            {effectiveBodyType === "json" ? (
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
      parseStringLiteralExpression(header.value) ?? ""
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
  { variable?: DataSource; onChange?: () => void; formDestination?: boolean }
>(({ variable, onChange, formDestination = false }, ref) => {
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
    resource?.bodyFormat === "json" || resource?.bodyFormat === "multipart"
      ? parsedHeaders.headers.filter(({ name }) => !isContentType(name))
      : parsedHeaders.headers
  );
  const [maxAge, setMaxAge] = useState(parsedHeaders.maxAge);
  const [bodyType, setBodyType] = useState(parsedHeaders.bodyType);
  const [body, setBody] = useState(resource?.body);
  const [bodyFormat, setBodyFormat] = useState<Resource["bodyFormat"]>(
    resource?.bodyFormat ?? "auto"
  );
  const bodyFormatId = useId();

  useImperativeHandle(ref, () => ({
    save: (formData) => {
      // preserve existing instance scope when edit
      const scopeInstanceId =
        variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
      if (scopeInstanceId === undefined) {
        return;
      }
      const resourceFields = createResourceFieldsFromFormData({ formData });
      return executeRuntimeMutation({
        id: "resources.upsert",
        input: {
          resourceId: resource?.id,
          resource: resourceFields,
          dataSourceId: variable?.id,
          scopeInstanceId,
          dataSourceName: resourceFields.name,
        },
      })?.result;
    },
  }));

  return (
    <>
      <Row>
        <MethodField
          value={method}
          onChange={(value) => {
            onChange?.();
            setMethod(value);
          }}
        />
      </Row>
      {formDestination && (
        <Row>
          <Text color="subtle">
            Form submissions use POST. This method applies elsewhere.
          </Text>
        </Row>
      )}
      <Row>
        <UrlField
          autoFocus
          scope={scope}
          aliases={aliases}
          value={url}
          onChange={(urlExpression, searchParams) => {
            onChange?.();
            setUrl(urlExpression);
            if (searchParams) {
              setSearchParams((prev) => [...prev, ...searchParams]);
            }
          }}
          onCurlPaste={(curl) => {
            onChange?.();
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
            setBodyFormat("auto");
          }}
        />
      </Row>
      <Row>
        <SearchParams
          scope={scope}
          aliases={aliases}
          searchParams={searchParams}
          onChange={(value) => {
            onChange?.();
            setSearchParams(value);
          }}
        />
      </Row>
      <Row>
        <CacheMaxAge
          value={maxAge}
          onChange={(newMaxAge) => {
            onChange?.();
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
          suggestHeaders
          scope={scope}
          aliases={aliases}
          headers={headers}
          onChange={(newHeaders) => {
            onChange?.();
            if (bodyFormat !== "auto") {
              newHeaders = newHeaders.filter(
                ({ name }) => !isContentType(name)
              );
            }
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
      {(method !== "get" || formDestination) && (
        <>
          <Row>
            <Grid gap={1}>
              <Label htmlFor={bodyFormatId}>Request body format</Label>
              <Select<NonNullable<Resource["bodyFormat"]>>
                id={bodyFormatId}
                value={bodyFormat ?? "auto"}
                options={["auto", "json", "multipart"]}
                onChange={(value) => {
                  onChange?.();
                  setBodyFormat(value);
                  if (value !== "auto") {
                    setHeaders((headers) =>
                      headers.filter(({ name }) => !isContentType(name))
                    );
                  }
                }}
              />
              <input type="hidden" name="body-format" value={bodyFormat} />
            </Grid>
          </Row>
          <Row>
            <BodyField
              scope={scope}
              aliases={aliases}
              value={body ?? ""}
              bodyType={bodyType}
              bodyFormat={bodyFormat}
              onChangeStart={onChange}
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
        </>
      )}
    </>
  );
});
ResourceForm.displayName = "ResourceForm";

export const EmailResourceForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource; onChange?: () => void }
>(({ variable, onChange }, ref) => {
  const { scope, aliases } = useResourceScope({ variable });
  const resources = useStore($resources);
  const dataSources = useStore($dataSources);
  const projectMeta = useStore($projectSettings)?.meta;
  const resource =
    variable?.type === "resource"
      ? resources.get(variable.resourceId)
      : undefined;
  const [settings, setSettings] = useState<EmailResourceSettings>(
    resource?.email ?? {}
  );
  const formDataIdentifier = Array.from(aliases).find(
    ([, alias]) => alias === formDataParameterName
  )?.[0];
  const browserInfoIdentifier = Array.from(aliases).find(
    ([, alias]) => alias === browserInfoParameterName
  )?.[0];
  const defaultBody = formDataIdentifier
    ? getDefaultFormEmailBodyExpression(
        formDataIdentifier,
        browserInfoIdentifier,
        projectMeta?.emailBody
      )
    : JSON.stringify(projectMeta?.emailBody || defaultEmailBody);
  const setField = <K extends keyof EmailResourceSettings>(
    key: K,
    value: EmailResourceSettings[K]
  ) => {
    onChange?.();
    setSettings((previous) => ({ ...previous, [key]: value }));
  };
  const resetField = (key: keyof EmailResourceSettings) => {
    onChange?.();
    setSettings((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };
  const senderError =
    settings.sender === undefined
      ? undefined
      : settings.sender === ""
        ? "Sender is required."
        : validateEmailSender(settings.sender);
  const recipientError =
    settings.recipientMode !== "custom"
      ? undefined
      : (validateContactEmail(settings.recipients ?? "") ??
        (settings.recipients ? undefined : "Enter at least one recipient."));
  const unavailableFormBinding = (expression: string) =>
    Array.from(getExpressionIdentifiers(expression)).some((identifier) => {
      const id = decodeDataVariableId(identifier);
      const dataSource = id ? dataSources.get(id) : undefined;
      return (
        dataSource?.type === "parameter" &&
        (dataSource.name === formDataParameterName ||
          dataSource.name === browserInfoParameterName) &&
        aliases.has(identifier) === false
      );
    })
      ? "This Form binding is unavailable outside its Form."
      : undefined;
  const getEmailExpressionError = (key: "subject" | "body") => {
    const expression = settings[key];
    if (expression === undefined) {
      return;
    }
    return (
      unavailableFormBinding(expression) ??
      getResourceExpressionErrors({ email: { [key]: expression } })[0] ??
      getExpressionErrorMessages({
        expression,
        availableVariables: new Set(aliases.keys()),
      })[0]
    );
  };
  const subjectError = getEmailExpressionError("subject");
  const bodyError = getEmailExpressionError("body");
  useImperativeHandle(ref, () => ({
    save: (formData) => {
      if (senderError || recipientError || subjectError || bodyError) {
        return false;
      }
      const scopeInstanceId =
        variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
      if (scopeInstanceId === undefined) {
        return;
      }
      const parsedSettings = JSON.parse(
        String(formData.get("email-settings") ?? "{}")
      ) as EmailResourceSettings;
      const resourceFields = createResourceFieldsFromFormData({
        control: "email",
        formData,
      });
      return executeRuntimeMutation({
        id: "resources.upsert",
        input: {
          resourceId: resource?.id,
          resource: { ...resourceFields, email: parsedSettings },
          dataSourceId: variable?.id,
          scopeInstanceId,
          dataSourceName: resourceFields.name,
        },
      })?.result;
    },
  }));
  const textField = (
    key: "sender" | "subject" | "body",
    label: string,
    value: string,
    placeholder: string,
    error?: string
  ) => (
    <Row key={key}>
      <Grid gap={1}>
        <Flex align="center" justify="between">
          <Label>{label}</Label>
          {settings[key] !== undefined && (
            <Button type="button" color="ghost" onClick={() => resetField(key)}>
              Reset to project default
            </Button>
          )}
        </Flex>
        <InputErrorsTooltip errors={error ? [error] : undefined}>
          {key === "sender" ? (
            <TextArea
              rows={1}
              autoGrow
              value={value}
              placeholder={placeholder}
              color={error ? "error" : undefined}
              onChange={(next) => setField(key, next)}
            />
          ) : (
            <ExpressionEditor
              scope={scope}
              aliases={aliases}
              value={value}
              color={error ? "error" : undefined}
              onChange={(next) => setField(key, next)}
              onChangeComplete={() => {}}
            />
          )}
        </InputErrorsTooltip>
        {error && <Text color="destructive">{error}</Text>}
      </Grid>
    </Row>
  );
  return (
    <>
      <input type="hidden" name="method" value="post" />
      <input type="hidden" name="url" value={'""'} />
      <input
        type="hidden"
        name="email-settings"
        value={JSON.stringify(settings)}
      />
      <Row>
        <Grid gap={1}>
          <Label>Team recipients</Label>
          <Select<"project" | "custom">
            options={["project", "custom"]}
            value={settings.recipientMode ?? "project"}
            getLabel={(value: "project" | "custom") =>
              value === "project"
                ? "Project recipients (or owner)"
                : "Custom recipients"
            }
            onChange={(value: "project" | "custom") =>
              setField("recipientMode", value)
            }
          />
        </Grid>
      </Row>
      {settings.recipientMode === "custom" && (
        <Row>
          <Grid gap={1}>
            <Flex align="center" justify="between">
              <Label>Recipients</Label>
              <Button
                type="button"
                color="ghost"
                onClick={() => {
                  resetField("recipientMode");
                  resetField("recipients");
                }}
              >
                Reset to project default
              </Button>
            </Flex>
            <InputErrorsTooltip
              errors={recipientError ? [recipientError] : undefined}
            >
              <TextArea
                rows={1}
                autoGrow
                value={settings.recipients ?? ""}
                placeholder="Olegs Isonen <oleg008@gmail.com>, team@example.com"
                color={recipientError ? "error" : undefined}
                onChange={(value) => setField("recipients", value)}
              />
            </InputErrorsTooltip>
          </Grid>
        </Row>
      )}
      {textField(
        "sender",
        "Sender",
        settings.sender ?? projectMeta?.emailSender ?? "",
        "Olegs Isonen <oleg008@gmail.com>",
        senderError
      )}
      <Row>
        <Text color="subtle">
          Emails are sent through Webstudio. Replies go to this address.
        </Text>
      </Row>
      {textField(
        "subject",
        "Subject expression",
        settings.subject ??
          JSON.stringify(projectMeta?.emailSubject || "New form submission"),
        '"New form submission"',
        subjectError
      )}
      {textField(
        "body",
        "Plain-text body expression",
        settings.body ?? defaultBody,
        "Add text or a JavaScript expression",
        bodyError
      )}
      <Row>
        <Grid gap={1}>
          <Label>Attachments</Label>
          <Select<"include" | "exclude">
            options={["include", "exclude"]}
            value={
              settings.includeAttachments === false ? "exclude" : "include"
            }
            getLabel={(value: "include" | "exclude") =>
              value === "include"
                ? "Attach submitted files"
                : "Do not attach files"
            }
            onChange={(value: "include" | "exclude") =>
              setField("includeAttachments", value === "include")
            }
          />
        </Grid>
      </Row>
    </>
  );
});
EmailResourceForm.displayName = "EmailResourceForm";

type SystemResourceFormProps = {
  variable?: DataSource;
  onChange?: () => void;
  querySourceContainer?: Element | null;
  onQueryActiveChange?: (active: boolean) => void;
  onQueryPendingChange?: (pending: boolean) => void;
};

const AssetQueryLoadingFallback = ({
  onPendingChange,
}: {
  onPendingChange?: (pending: boolean) => void;
}) => {
  useEffect(() => {
    onPendingChange?.(true);
    return () => onPendingChange?.(false);
  }, [onPendingChange]);
  return <CenteredPanelMessage>Loading query editor…</CenteredPanelMessage>;
};

export const SystemResourceForm = forwardRef<
  undefined | PanelApi,
  SystemResourceFormProps
>((props, ref) => {
  const {
    variable,
    onChange,
    querySourceContainer,
    onQueryActiveChange,
    onQueryPendingChange,
  } = props;
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
  useEffect(() => {
    onQueryActiveChange?.(isAssetsResource);
    return () => {
      onQueryActiveChange?.(false);
      onQueryPendingChange?.(false);
    };
  }, [isAssetsResource, onQueryActiveChange, onQueryPendingChange]);
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
      const result = executeRuntimeMutation({
        id: "resources.upsert",
        input: {
          resourceId: resource?.id,
          resource: resourceFields,
          dataSourceId: variable?.id,
          scopeInstanceId,
          dataSourceName: resourceFields.name,
        },
      });
      if (isAssetsResource && result !== undefined) {
        // The initial preview can finish before the updated build reaches the
        // server. Refresh again once merged-database planning sees the save.
        onNextTransactionComplete(invalidateAssets);
      }
      return result?.result;
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
            onChange={(value) => {
              onChange?.();
              setLocalResource(value);
            }}
          />
        </Grid>
      </Row>
      {isAssetsResource && (
        <Suspense
          fallback={
            <AssetQueryLoadingFallback onPendingChange={onQueryPendingChange} />
          }
        >
          <AssetQueryForm
            resource={resource}
            scope={scope}
            aliases={aliases}
            sourceContainer={querySourceContainer}
            onPendingChange={onQueryPendingChange}
            onChange={onChange}
          />
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
  { variable?: DataSource; onChange?: () => void }
>(({ variable, onChange }, ref) => {
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

  const [bodyExpressions] = useState(
    () => parseExpressionObject(resource?.body ?? "") ?? new Map()
  );
  const queryId = useId();
  const [query, setQuery] = useState(
    () => parseStringLiteralExpression(bodyExpressions.get("query") ?? "") ?? ""
  );
  const [variables, setVariables] = useState(
    () => bodyExpressions.get("variables") ?? "{}"
  );
  const [isVariablesLiteral, setIsVariablesLiteral] = useState(() =>
    isLiteralExpression(variables)
  );
  const [variablesError, setVariablesError] = useState("");
  const variablesRef = useRef<HTMLInputElement>(null);
  const evaluatedVariables = useAsyncValue(
    () => evaluateExpressionWithinScope(variables, scope),
    [scope, variables],
    undefined
  );
  useEffect(() => {
    variablesRef.current?.setCustomValidity(
      typeof evaluatedVariables === "object" && evaluatedVariables !== null
        ? ""
        : "Expected valid JSON object in GraphQL variables"
    );
    setVariablesError("");
  }, [evaluatedVariables]);

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
      return executeRuntimeMutation({
        id: "resources.upsert",
        input: {
          resourceId: resource?.id,
          resource: resourceFields,
          dataSourceId: variable?.id,
          scopeInstanceId,
          dataSourceName: resourceFields.name,
        },
      })?.result;
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
          onChange={(value) => {
            onChange?.();
            setUrl(value);
          }}
          onCurlPaste={(curl) => {
            onChange?.();
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
              onChange={(value) => {
                onChange?.();
                setQuery(value);
              }}
            />
            <EditorDialog
              title="GraphQL query"
              content={
                <TextArea
                  grow={true}
                  value={query}
                  onChange={(value) => {
                    onChange?.();
                    setQuery(value);
                  }}
                />
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
                : (JSON.stringify(evaluatedVariables, null, 2) ?? "")
            }
            bound={isVariablesLiteral === false}
            scope={scope}
            aliases={aliases}
            onChangeValue={(value) => {
              onChange?.();
              setVariables(value);
            }}
            onChangeExpression={(value) => {
              onChange?.();
              setVariables(value);
              setIsVariablesLiteral(isLiteralExpression(value));
            }}
            onRemove={(value) => {
              onChange?.();
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
            onChange?.();
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
            onChange?.();
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
