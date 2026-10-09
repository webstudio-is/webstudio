import {
  $livePreviewFormValues,
  getFormOccurrenceKey,
} from "~/shared/preview-form-values";
import {
  getFormDataPreview,
  getBrowserInfoPreview,
} from "./form-context-preview";
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
  findTreeInstanceIds,
  getFormEmailFieldNames,
  defaultEmailBody,
  getResourceCycleDataSourceIds,
  isFormSubmission,
  SYSTEM_VARIABLE_ID,
  systemParameter,
  type Instances,
  type Props,
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
  parseJsonExpression,
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
  Combobox,
  Flex,
  Grid,
  InputErrorsTooltip,
  InputField,
  Label,
  Radio,
  RadioAndLabel,
  RadioGroup,
  Select,
  SmallIconButton,
  Text,
  TextArea,
  Tooltip,
  theme,
  cssVar,
} from "@webstudio-is/design-system";
import { MinusIcon, InfoCircleIcon, PlusIcon } from "@webstudio-is/icons";
import { humanizeString } from "~/shared/string-utils";
import {
  $selectedInstance,
  $selectedInstancePathWithRoot,
  $selectedPage,
  $variableValuesByInstanceSelector,
  getInstanceKey,
} from "~/shared/nano-states";
import {
  $dataSources,
  $instances,
  $props,
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
  formDestination = false,
}: {
  value: Resource["method"];
  onChange: (value: Resource["method"]) => void;
  formDestination?: boolean;
}) => {
  return (
    <Grid gap={1}>
      <Label>Method</Label>
      <Select<Resource["method"]>
        fullWidth
        options={["get", "post", "put", "delete"]}
        getLabel={humanizeString}
        getDescription={(method) => (
          <Box css={{ width: "100%" }}>
            {[
              {
                get: "Read data from a server.",
                post: "Send data to create or process something.",
                put: "Replace data on a server.",
                delete: "Delete data from a server.",
              }[method],
              formDestination && method === "post"
                ? "Form submissions use POST. This method applies elsewhere."
                : undefined,
            ]
              .filter(Boolean)
              .join(" ")}
          </Box>
        )}
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
        icon={<MinusIcon />}
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
        <Flex align="center" gap={1}>
          <Label>{label}</Label>
          <Tooltip
            content={
              kind === "header"
                ? "Headers are name-value pairs sent with the request. Use them to tell the server how to interpret the request or who is making it."
                : "Search params are name-value pairs added to the URL after ?. Use them to send filters, search terms, or other request options."
            }
          >
            <InfoCircleIcon
              color={cssVar("--foreground-secondary")}
              aria-label={`About ${label.toLowerCase()}`}
              tabIndex={0}
            />
          </Tooltip>
        </Flex>
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
      <Flex align="center" css={{ gap: theme.spacing[3] }}>
        <Label htmlFor="resource-panel-max-age">Cache max age</Label>
        <Tooltip
          content="How long to cache the response, in seconds."
          variant="wrapped"
          disableHoverableContent={true}
        >
          <InfoCircleIcon
            aria-label="About Cache max age"
            color={cssVar("--foreground-secondary")}
            tabIndex={0}
          />
        </Tooltip>
      </Flex>
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
  formScopeSelector,
  instances = new Map(),
  props = new Map(),
  liveFormValues = new Map(),
}: {
  page: undefined | Page | PageTemplate;
  instanceKey: undefined | string;
  dataSources: DataSources;
  variableValuesByInstanceSelector: Map<string, Map<string, unknown>>;
  includeResourceDataSources?: boolean;
  formScopeInstanceId?: string;
  formScopeSelector?: readonly string[];
  instances?: Instances;
  props?: Props;
  liveFormValues?: ReadonlyMap<string, Record<string, unknown>>;
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
          ? (liveFormValues.get(
              getFormOccurrenceKey(formScopeSelector, formScopeInstanceId) ?? ""
            ) ?? getFormDataPreview(instances, props, formScopeInstanceId))
          : getBrowserInfoPreview();
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

const areMapsShallowEqual = <Key, Value>(
  left: ReadonlyMap<Key, Value> | undefined,
  right: ReadonlyMap<Key, Value> | undefined
) => {
  if (left === right) {
    return true;
  }
  if (left === undefined || right === undefined || left.size !== right.size) {
    return false;
  }
  for (const [key, value] of left) {
    if (
      right.has(key) === false ||
      Object.is(right.get(key), value) === false
    ) {
      return false;
    }
  }
  return true;
};

const areSetsEqual = <Value,>(
  left: ReadonlySet<Value>,
  right: ReadonlySet<Value>
) => left.size === right.size && [...left].every((value) => right.has(value));

export const useResourceScope = ({ variable }: { variable?: DataSource }) => {
  return useStore(
    useMemo(() => {
      let cachedBaseInputs: readonly unknown[] | undefined;
      let cachedBaseValues: Map<string, unknown> | undefined;
      let cachedBaseResult:
        | ReturnType<typeof getResourceScopeForInstance>
        | undefined;
      let cachedCycleDataSourceIds: Set<DataSource["id"]> | undefined;
      let cachedResult:
        | {
            scope: Record<string, unknown>;
            aliases: Map<string, string>;
            variableValues: Map<DataSource["id"], unknown>;
          }
        | undefined;

      return computed(
        [
          $selectedPage,
          $selectedInstancePathWithRoot,
          $variableValuesByInstanceSelector,
          $dataSources,
          $resources,
          $instances,
          $props,
          $livePreviewFormValues,
        ],
        (
          page,
          instancePath,
          variableValuesByInstanceSelector,
          dataSources,
          resources,
          instances,
          props,
          liveFormValues
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
          const formScopeSelector =
            formScopeInstanceId === undefined
              ? undefined
              : instancePath?.find(
                  ({ instance }) => instance.id === formScopeInstanceId
                )?.instanceSelector;
          const instanceKey = getVariableInstanceKey({
            variable,
            instancePath,
          });
          const values = variableValuesByInstanceSelector.get(
            instanceKey ?? ""
          );
          const currentBaseInputs = [
            page,
            instancePath,
            dataSources,
            instances,
            props,
            liveFormValues,
          ] as const;
          const baseInputsMatch =
            cachedBaseInputs !== undefined &&
            cachedBaseInputs[0] === page &&
            cachedBaseInputs[1] === instancePath &&
            cachedBaseInputs[2] === dataSources &&
            cachedBaseInputs[3] === instances &&
            cachedBaseInputs[4] === props &&
            cachedBaseInputs[5] === liveFormValues &&
            areMapsShallowEqual(cachedBaseValues, values);
          if (baseInputsMatch === false) {
            cachedBaseInputs = currentBaseInputs;
            cachedBaseValues = values;
            cachedBaseResult = getResourceScopeForInstance({
              page,
              instanceKey,
              dataSources,
              variableValuesByInstanceSelector,
              includeResourceDataSources: true,
              formScopeInstanceId,
              formScopeSelector,
              instances,
              props,
              liveFormValues,
            });
          }
          const cycleDataSourceIds = new Set(
            variable === undefined
              ? []
              : variable.type === "resource"
                ? getResourceCycleDataSourceIds({
                    resourceDataSource: variable,
                    resources,
                    dataSources,
                  })
                : [variable.id]
          );
          if (
            cachedResult !== undefined &&
            baseInputsMatch &&
            cachedCycleDataSourceIds !== undefined &&
            areSetsEqual(cachedCycleDataSourceIds, cycleDataSourceIds)
          ) {
            return cachedResult;
          }

          const { scope, aliases, variableValues } = cachedBaseResult!;
          const newScope = { ...scope };
          const newAliases = new Map(aliases);
          const newVariableValues = new Map(variableValues);
          for (const dataSourceId of cycleDataSourceIds) {
            const key = encodeDataVariableId(dataSourceId);
            delete newScope[key];
            newAliases.delete(key);
            newVariableValues.delete(dataSourceId);
          }
          const result = {
            scope: newScope,
            aliases: newAliases,
            variableValues: newVariableValues,
          };
          cachedCycleDataSourceIds = cycleDataSourceIds;
          cachedResult = result;
          return result;
        }
      );
    }, [variable])
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

const getBodyType = (value: unknown): BodyType => {
  if (typeof value === "string") {
    return "text";
  }
  if (
    value === null ||
    typeof value === "object" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return "json";
  }
};

const BodyField = ({
  scope,
  aliases,
  hasContentTypeHeader = false,
  bodyFormat,
  value,
  onChangeStart,
  onChange,
}: {
  aliases: Map<string, string>;
  scope: Record<string, unknown>;
  hasContentTypeHeader?: boolean;
  bodyFormat: Resource["bodyFormat"];
  value: string;
  onChangeStart?: () => void;
  onChange: (value: string) => void;
}) => {
  const [isBodyLiteral, setIsBodyLiteral] = useState(
    () => value === "" || isLiteralExpression(value)
  );
  const [bodyError, setBodyError] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const evaluatedValue = useAsyncValue(
    () => evaluateExpressionWithinScope(value, scope),
    [scope, value],
    parseJsonExpression(value)
  );
  const inferredBodyType = getBodyType(evaluatedValue);
  const [lastBodyType, setLastBodyType] = useState(inferredBodyType);
  useEffect(() => {
    if (inferredBodyType !== undefined || value === "") {
      setLastBodyType(inferredBodyType);
    }
  }, [inferredBodyType, value]);
  // Keep the JSON editor while an in-progress edit is temporarily invalid.
  const bodyType = inferredBodyType ?? lastBodyType;
  const effectiveBodyType = bodyFormat === "auto" ? bodyType : "json";
  useEffect(() => {
    let canceled = false;
    void validateResourceBodyExpression(value, effectiveBodyType, scope).then(
      async (error) => {
        let validationError: string = error;
        if (bodyFormat === "auto" && value !== "") {
          const body = await evaluateExpressionWithinScope(value, scope);
          if (
            body === null ||
            typeof body === "number" ||
            typeof body === "boolean"
          ) {
            validationError = "";
          }
        }
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
  const updateBody = (newBody: string) => {
    onChangeStart?.();
    onChange(newBody);
  };
  const displayedValue = isBodyLiteral
    ? value
    : effectiveBodyType === "json"
      ? (JSON.stringify(evaluatedValue, null, 2) ?? "")
      : String(evaluatedValue ?? "");

  return (
    <Grid gap={1}>
      <Label>Body</Label>
      {bodyFormat === "auto" && bodyType && !hasContentTypeHeader && (
        <>
          <input type="hidden" name="header-name" value="Content-Type" />
          <input
            type="hidden"
            name="header-value"
            value={
              isLiteralExpression(value)
                ? JSON.stringify(toMime(bodyType))
                : `typeof (${value}) === "string" ? "text/plain" : "application/json"`
            }
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
        onChangeValue={updateBody}
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
            <div>
              <ExpressionEditor
                showLineNumbers
                color={bodyError ? "error" : undefined}
                readOnly={readOnly}
                value={value}
                onChange={onChangeValue}
                onChangeComplete={() => bodyRef.current?.checkValidity()}
              />
            </div>
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
        return false;
      }
      if (value === "text/plain") {
        return false;
      }
    }
    return true;
  });
  return { headers: newHeaders, maxAge };
};

export const ResourceForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource; onChange?: () => void }
>(({ variable, onChange }, ref) => {
  const { scope, aliases } = useResourceScope({ variable });
  const props = useStore($props);
  const instances = useStore($instances);
  const formDestination =
    variable !== undefined &&
    Array.from(props.values()).some(
      (prop) =>
        instances.get(prop.instanceId)?.component === "NativeForm" &&
        prop.name === "action" &&
        prop.type === "json" &&
        isFormSubmission(prop.value) &&
        prop.value.some(({ dataSourceId }) => dataSourceId === variable.id)
    );

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
          formDestination={formDestination}
          onChange={(value) => {
            onChange?.();
            setMethod(value);
          }}
        />
      </Row>
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
            setHeaders(newHeaders);
          }}
        />
      </Row>
      {(method !== "get" || formDestination) && (
        <>
          <Row>
            <Grid gap={1}>
              <Label htmlFor={bodyFormatId}>Format</Label>
              <Select<NonNullable<Resource["bodyFormat"]>>
                id={bodyFormatId}
                value={bodyFormat ?? "auto"}
                options={["auto", "json", "multipart"]}
                getLabel={(value: NonNullable<Resource["bodyFormat"]>) =>
                  ({
                    auto: "auto",
                    json: "application/json",
                    multipart: "multipart/form-data",
                  })[value]
                }
                getDescription={(value: NonNullable<Resource["bodyFormat"]>) =>
                  ({
                    auto: "Uses text/plain for text values, application/json for other values, and multipart/form-data when files are included.",
                    json: "Sends an object or array as JSON.",
                    multipart: "Sends fields as form data, including files.",
                  })[value]
                }
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
              <Text variant="small" color="subtle">
                Choose how to send the body.
              </Text>
              <input type="hidden" name="body-format" value={bodyFormat} />
            </Grid>
          </Row>
          <Row>
            <BodyField
              scope={scope}
              aliases={aliases}
              value={body ?? ""}
              hasContentTypeHeader={headers.some(({ name }) =>
                isContentType(name)
              )}
              bodyFormat={bodyFormat}
              onChangeStart={onChange}
              onChange={setBody}
            />
          </Row>
        </>
      )}
    </>
  );
});
ResourceForm.displayName = "ResourceForm";

const EmailExpressionField = ({
  label,
  accessibleName,
  expression,
  placeholder,
  scope,
  aliases,
  error,
  onChange,
  multiline = false,
}: {
  label?: string;
  accessibleName?: string;
  expression: string;
  placeholder: string;
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  error?: string;
  onChange: (expression: string) => void;
  multiline?: boolean;
}) => {
  const id = useId();
  const evaluatedValue = useAsyncValue(
    () => evaluateExpressionWithinScope(expression, scope),
    [expression, scope],
    ""
  );
  const value = String(evaluatedValue ?? "");
  const onChangeValue = (nextValue: string) =>
    onChange(JSON.stringify(nextValue));

  const control = (
    <BindableExpressionControl
      expression={expression}
      value={value}
      bound={isLiteralExpression(expression) === false}
      scope={scope}
      aliases={aliases}
      onChangeValue={onChangeValue}
      onChangeExpression={onChange}
      onRemove={(evaluatedValue) =>
        onChange(JSON.stringify(String(evaluatedValue ?? "")))
      }
      renderControl={({ value, readOnly, onChangeValue }) => (
        <InputErrorsTooltip errors={error ? [error] : undefined}>
          {multiline ? (
            <TextArea
              id={id}
              aria-label={accessibleName}
              rows={4}
              autoGrow
              disabled={readOnly}
              value={value}
              placeholder={placeholder}
              color={error ? "error" : undefined}
              onChange={onChangeValue}
            />
          ) : (
            <InputField
              id={id}
              aria-label={accessibleName}
              value={value}
              placeholder={placeholder}
              disabled={readOnly}
              color={error ? "error" : undefined}
              onChange={(event) => onChangeValue(event.target.value)}
            />
          )}
        </InputErrorsTooltip>
      )}
    />
  );
  return label ? (
    <Row>
      <Grid gap={1}>
        <Label htmlFor={id}>{label}</Label>
        {control}
      </Grid>
    </Row>
  ) : (
    control
  );
};

export const EmailResourceForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource; onChange?: () => void }
>(({ variable, onChange }, ref) => {
  const { scope, aliases } = useResourceScope({ variable });
  const resources = useStore($resources);
  const dataSources = useStore($dataSources);
  const instances = useStore($instances);
  const props = useStore($props);
  const projectMeta = useStore($projectSettings)?.meta;
  const attachmentId = useId();
  const recipientsLabelId = useId();
  const resource =
    variable?.type === "resource"
      ? resources.get(variable.resourceId)
      : undefined;
  const { scope: emailIdentityScope, aliases: emailIdentityAliases } =
    useMemo(() => {
      const emailIdentityScope = { ...scope };
      const emailIdentityAliases = new Map(aliases);
      for (const [identifier] of aliases) {
        const dataSourceId = decodeDataVariableId(identifier);
        if (
          dataSourceId &&
          dataSources.get(dataSourceId)?.type === "resource"
        ) {
          delete emailIdentityScope[identifier];
          emailIdentityAliases.delete(identifier);
        }
      }
      return { scope: emailIdentityScope, aliases: emailIdentityAliases };
    }, [aliases, dataSources, scope]);
  const scopeInstanceId =
    variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
  const formId = Array.from(instances.values()).find(
    (instance) =>
      instance.component === "NativeForm" &&
      scopeInstanceId !== undefined &&
      findTreeInstanceIds(instances, instance.id).has(scopeInstanceId)
  )?.id;
  const emailFields =
    formId === undefined
      ? []
      : getFormEmailFieldNames(instances, props, formId);
  const [settings, setSettings] = useState<EmailResourceSettings>(
    resource?.email ?? {}
  );
  const formDataIdentifier = Array.from(aliases).find(
    ([, alias]) => alias === formDataParameterName
  )?.[0];
  const browserInfoIdentifier = Array.from(aliases).find(
    ([, alias]) => alias === browserInfoParameterName
  )?.[0];
  const defaultBody =
    settings.recipientMode === "visitor"
      ? JSON.stringify("")
      : formDataIdentifier
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
  const getEmailExpressionError = (
    key: "senderExpression" | "recipientsExpression" | "subject" | "body"
  ) => {
    const expression = settings[key];
    if (expression === undefined) {
      return;
    }
    return (
      unavailableFormBinding(expression) ??
      getResourceExpressionErrors({ email: { [key]: expression } })[0] ??
      getExpressionErrorMessages({
        expression,
        availableVariables: new Set(
          (key === "senderExpression" || key === "recipientsExpression"
            ? emailIdentityAliases
            : aliases
          ).keys()
        ),
      })[0]
    );
  };
  const senderError =
    settings.senderExpression !== undefined
      ? getEmailExpressionError("senderExpression")
      : settings.sender === undefined
        ? undefined
        : settings.sender === ""
          ? "Sender is required."
          : validateEmailSender(settings.sender);
  const recipientError =
    settings.recipientMode === "visitor"
      ? !settings.visitorEmailField ||
        !emailFields.includes(settings.visitorEmailField)
        ? "Select one named email input in this Form."
        : undefined
      : settings.recipientMode !== "custom"
        ? undefined
        : settings.recipientsExpression !== undefined
          ? getEmailExpressionError("recipientsExpression")
          : (validateContactEmail(settings.recipients ?? "") ??
            (settings.recipients
              ? undefined
              : "Enter at least one recipient."));
  const subjectError = getEmailExpressionError("subject");
  const bodyError = getEmailExpressionError("body");
  const setEmailExpression = (
    expressionKey: "senderExpression" | "recipientsExpression",
    valueKey: "sender" | "recipients",
    expression: string
  ) => {
    let literalValue: string | undefined;
    try {
      const parsed: unknown = JSON.parse(expression);
      if (typeof parsed === "string") {
        literalValue = parsed;
      }
    } catch {
      // Non-literal expressions are stored as bindings and validated at submit.
    }
    if (literalValue === undefined) {
      setField(expressionKey, expression);
      return;
    }
    onChange?.();
    setSettings((previous) => {
      const next = { ...previous, [valueKey]: literalValue };
      delete next[expressionKey];
      return next;
    });
  };
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
  const senderField = (
    <EmailExpressionField
      label="Sender"
      expression={
        settings.senderExpression ??
        JSON.stringify(settings.sender ?? projectMeta?.emailSender ?? "")
      }
      placeholder="Acme <acme@example.com>"
      scope={emailIdentityScope}
      aliases={emailIdentityAliases}
      error={senderError}
      onChange={(expression) =>
        setEmailExpression("senderExpression", "sender", expression)
      }
    />
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
          <Label id={recipientsLabelId}>Recipients</Label>
          <Select<"project" | "custom" | "visitor">
            aria-labelledby={recipientsLabelId}
            options={
              formId === undefined
                ? ["project", "custom"]
                : ["project", "custom", "visitor"]
            }
            value={settings.recipientMode ?? "project"}
            getLabel={(value: "project" | "custom" | "visitor") =>
              value === "project"
                ? "Project recipients (or owner)"
                : value === "custom"
                  ? "Custom recipients"
                  : "Visitor email field"
            }
            getDescription={(value: "project" | "custom" | "visitor") =>
              value === "project"
                ? "Send to the addresses in Project Settings, or to the account holder if none are set."
                : value === "custom"
                  ? "Send to the addresses entered below."
                  : "Choose a Form input to use as the recipient’s email address."
            }
            onChange={(value: "project" | "custom" | "visitor") => {
              if (value === "project") {
                onChange?.();
                setSettings((previous) => {
                  const next = { ...previous };
                  delete next.recipientMode;
                  delete next.recipients;
                  delete next.recipientsExpression;
                  return next;
                });
              } else if (value === "visitor") {
                onChange?.();
                setSettings((previous) => {
                  const next = { ...previous, recipientMode: value };
                  delete next.recipients;
                  delete next.recipientsExpression;
                  return next;
                });
              } else {
                setField("recipientMode", value);
              }
            }}
          />
          {settings.recipientMode === "custom" && (
            <EmailExpressionField
              accessibleName="Custom recipients"
              expression={
                settings.recipientsExpression ??
                JSON.stringify(settings.recipients ?? "")
              }
              placeholder="Acme <acme@example.com>, team@example.com"
              scope={emailIdentityScope}
              aliases={emailIdentityAliases}
              error={recipientError}
              onChange={(expression) =>
                setEmailExpression(
                  "recipientsExpression",
                  "recipients",
                  expression
                )
              }
            />
          )}
        </Grid>
      </Row>
      {settings.recipientMode === "visitor" && (
        <Row>
          <Grid gap={1}>
            <Flex align="center" gap={1}>
              <Box css={{ flexGrow: 1, minWidth: 0 }}>
                <InputErrorsTooltip
                  errors={recipientError ? [recipientError] : undefined}
                >
                  <Select
                    fullWidth
                    aria-label="Visitor email field"
                    value={settings.visitorEmailField}
                    placeholder="Select an email field"
                    options={emailFields}
                    getLabel={(name) => name}
                    onChange={(name) => setField("visitorEmailField", name)}
                  />
                </InputErrorsTooltip>
              </Box>
              <Tooltip
                content="Adds a note with this site’s URL to help recipients identify where the message came from and discourage spam."
                variant="wrapped"
                disableHoverableContent={true}
                openOnFocus
              >
                <InfoCircleIcon
                  aria-label="About Visitor email field"
                  color={cssVar("--foreground-secondary")}
                  tabIndex={0}
                />
              </Tooltip>
            </Flex>
          </Grid>
        </Row>
      )}
      {senderField}
      <EmailExpressionField
        label="Subject"
        expression={
          settings.subject ??
          JSON.stringify(
            settings.recipientMode === "visitor"
              ? projectMeta?.emailConfirmationSubject ||
                  "We received your submission"
              : projectMeta?.emailSubject || "New form submission"
          )
        }
        placeholder="New form submission"
        scope={scope}
        aliases={aliases}
        error={subjectError}
        onChange={(value) => setField("subject", value)}
      />
      <EmailExpressionField
        label="Body"
        expression={settings.body ?? defaultBody}
        placeholder=""
        multiline
        scope={scope}
        aliases={aliases}
        error={bodyError}
        onChange={(value) => setField("body", value)}
      />
      <Row>
        <Grid gap={1}>
          <Label id={`${attachmentId}-label`}>Attachments</Label>
          <RadioGroup
            aria-labelledby={`${attachmentId}-label`}
            value={
              settings.includeAttachments === false ? "exclude" : "include"
            }
            onValueChange={(value) =>
              setField("includeAttachments", value === "include")
            }
          >
            <RadioAndLabel>
              <Radio value="include" id={`${attachmentId}-include`} />
              <Label htmlFor={`${attachmentId}-include`}>
                Attach submitted files
              </Label>
            </RadioAndLabel>
            <RadioAndLabel>
              <Radio value="exclude" id={`${attachmentId}-exclude`} />
              <Label htmlFor={`${attachmentId}-exclude`}>
                Do not attach files
              </Label>
            </RadioAndLabel>
          </RadioGroup>
        </Grid>
      </Row>
    </>
  );
});
EmailResourceForm.displayName = "EmailResourceForm";

type SystemResourceFormProps = {
  variable?: DataSource;
  resourceType:
    | "sitemap-resource"
    | "current-date-resource"
    | "assets-resource"
    | "email-resource";
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
    resourceType,
    onChange,
    querySourceContainer,
    onQueryActiveChange,
    onQueryPendingChange,
  } = props;
  const { scope, aliases } = useResourceScope({ variable });
  const resources = useStore($resources);

  const resource =
    variable?.type === "resource"
      ? resources.get(variable.resourceId)
      : undefined;
  const assetsLocalResource = {
    value: JSON.stringify(assetsResourceUrl),
  };
  const emailLocalResource = {
    value: "email",
  };
  const localResources = [
    {
      value: JSON.stringify(sitemapResourceUrl),
    },
    {
      value: JSON.stringify(currentDateResourceUrl),
    },
    assetsLocalResource,
    emailLocalResource,
  ];

  const selectedLocalResourceValue = {
    "sitemap-resource": JSON.stringify(sitemapResourceUrl),
    "current-date-resource": JSON.stringify(currentDateResourceUrl),
    "assets-resource": JSON.stringify(assetsResourceUrl),
    "email-resource": emailLocalResource.value,
  }[resourceType];
  const localResource =
    localResources.find(
      (localResource) => localResource.value === selectedLocalResourceValue
    ) ?? localResources[0];
  const isEmailResource = localResource.value === emailLocalResource.value;
  const emailFormApi = useRef<undefined | PanelApi>(undefined);
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
      if (isEmailResource) {
        return emailFormApi.current?.save(formData) ?? false;
      }
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

  return (
    <>
      {!isEmailResource && (
        <>
          <input
            type="hidden"
            name="method"
            value={isAssetsResource ? "post" : "get"}
          />
          <input type="hidden" name="url" value={localResource.value} />
        </>
      )}
      {isEmailResource && (
        <EmailResourceForm
          ref={emailFormApi}
          variable={variable}
          onChange={onChange}
        />
      )}
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

export const __testing__ = { BodyField };
