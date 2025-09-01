import { z } from "zod";
import { computed } from "nanostores";
import { nanoid } from "nanoid";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useStore } from "@nanostores/react";
import {
  DataSources,
  Resource,
  type DataSource,
  type Page,
} from "@webstudio-is/sdk";
import {
  encodeDataVariableId,
  generateObjectExpression,
  isLiteralExpression,
  parseObjectExpression,
  SYSTEM_VARIABLE_ID,
  systemParameter,
} from "@webstudio-is/sdk";
import { serializeValue, sitemapResourceUrl } from "@webstudio-is/sdk/runtime";
import {
  Box,
  Flex,
  Grid,
  InputErrorsTooltip,
  InputField,
  Label,
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
  $dataSources,
  $resources,
  $variableValuesByInstanceSelector,
} from "~/shared/nano-states";
import {
  BindingControl,
  BindingPopover,
  evaluateExpressionWithinScope,
} from "~/builder/shared/binding-popover";
import { ExpressionEditor } from "~/builder/shared/expression-editor";
import {
  EditorDialog,
  EditorDialogButton,
  EditorDialogControl,
} from "~/builder/shared/code-editor-base";
import {
  $selectedInstance,
  $selectedInstancePathWithRoot,
  $selectedPage,
  getInstanceKey,
  type InstancePath,
} from "~/shared/awareness";
import { updateWebstudioData } from "~/shared/instance-utils";
import { rebindTreeVariablesMutable } from "~/shared/data-variables";
import { parseCurl, type CurlRequest } from "./curl";

export const parseResource = ({
  id,
  name,
  formData,
}: {
  id: string;
  name: string;
  formData: FormData;
}) => {
  const searchParamNames = formData.getAll("search-param-name") as string[];
  const searchParamValues = formData.getAll("search-param-value") as string[];
  const headerNames = formData.getAll("header-name") as string[];
  const headerValues = formData.getAll("header-value") as string[];
  return Resource.parse({
    id,
    name,
    url: formData.get("url"),
    searchParams: searchParamNames
      .map((name, index) => ({ name, value: searchParamValues[index] }))
      .filter((item) => item.name.trim()),
    method: formData.get("method"),
    headers: headerNames
      .map((name, index) => ({ name, value: headerValues[index] }))
      .filter((item) => item.name.trim()),
    // use undefined instead of empty string
    body: formData.get("body") || undefined,
  });
};

const validateUrl = (value: string, scope: Record<string, unknown>) => {
  const evaluatedValue = evaluateExpressionWithinScope(value, scope);
  if (typeof evaluatedValue !== "string") {
    return "URL expects a string";
  }
  if (evaluatedValue.length === 0) {
    return "URL is required";
  }
  try {
    new URL(evaluatedValue);
  } catch {
    return "URL is invalid";
  }
  return "";
};

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
    ref.current?.setCustomValidity(validateUrl(value, scope));
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
      <input hidden={true} readOnly={true} name="url" value={value} />
      <BindingControl>
        <InputErrorsTooltip errors={error ? [error] : undefined}>
          <TextArea
            ref={ref}
            name="url-validator"
            id={urlId}
            rows={1}
            grow={true}
            // expressions with variables cannot be edited
            disabled={isLiteralExpression(value) === false}
            color={error ? "error" : undefined}
            value={String(evaluateExpressionWithinScope(value, scope))}
            onChange={(value) => {
              const curl = parseCurl(value);
              if (curl) {
                onCurlPaste(curl);
                return;
              }
              try {
                const url = new URL(value);
                const searchParams: Resource["searchParams"] = [];
                for (const [name, value] of url.searchParams) {
                  searchParams.push({ name, value: JSON.stringify(value) });
                }
                // remove all search params from url
                url.search = "";
                // update text value as string literal
                onChange(JSON.stringify(url.href), searchParams);
              } catch {
                onChange(JSON.stringify(value));
              }
            }}
            onBlur={(event) => event.currentTarget.checkValidity()}
            onInvalid={(event) =>
              setError(event.currentTarget.validationMessage)
            }
          />
        </InputErrorsTooltip>
        <BindingPopover
          scope={scope}
          aliases={aliases}
          variant={isLiteralExpression(value) ? "default" : "bound"}
          value={value}
          onChange={onChange}
          onRemove={(evaluatedValue) =>
            onChange(JSON.stringify(evaluatedValue))
          }
        />
      </BindingControl>
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
  // expressions with variables or objects cannot be edited from input
  const isValueUnbound =
    isLiteralExpression(value) && typeof evaluatedValue === "string";
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
      <BindingControl>
        <InputField
          placeholder="Value"
          name="search-param-value-literal"
          disabled={!isValueUnbound}
          value={serializeValue(evaluatedValue)}
          // update text value as string literal
          onChange={(event) =>
            onChange(name, JSON.stringify(event.target.value))
          }
        />
        <BindingPopover
          scope={scope}
          aliases={aliases}
          variant={isValueUnbound ? "default" : "bound"}
          value={value}
          onChange={(newValue) => onChange(name, newValue)}
          onRemove={(evaluatedValue) =>
            onChange(name, JSON.stringify(evaluatedValue))
          }
        />
      </BindingControl>
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
        <Label>Search Params</Label>
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
  // expressions with variables or objects cannot be edited from input
  const isValueUnbound =
    isLiteralExpression(value) && typeof evaluatedValue === "string";
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
      <input hidden={true} readOnly={true} name="header-value" value={value} />
      <BindingControl>
        <InputField
          placeholder="Value"
          name="header-value-validator"
          disabled={!isValueUnbound}
          value={serializeValue(evaluatedValue)}
          // update text value as string literal
          onChange={(event) =>
            onChange(name, JSON.stringify(event.target.value))
          }
        />
        <BindingPopover
          scope={scope}
          aliases={aliases}
          variant={isValueUnbound ? "default" : "bound"}
          value={value}
          onChange={(newValue) => onChange(name, newValue)}
          onRemove={(evaluatedValue) =>
            onChange(name, JSON.stringify(evaluatedValue))
          }
        />
      </BindingControl>
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

export const getResourceScopeForInstance = ({
  page,
  instanceKey,
  dataSources,
  variableValuesByInstanceSelector,
}: {
  page: undefined | Page;
  instanceKey: undefined | string;
  dataSources: DataSources;
  variableValuesByInstanceSelector: Map<string, Map<string, unknown>>;
}) => {
  const scope: Record<string, unknown> = {};
  const aliases = new Map<string, string>();
  const variableValues = new Map<DataSource["id"], unknown>();
  const hiddenDataSourceIds = new Set<DataSource["id"]>();
  for (const dataSource of dataSources.values()) {
    // hide collection item and component parameters from resources
    // to prevent waterfall and loop requests ans not complicate compiler
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
        variableValues.set(dataSourceId, value);
        scope[name] = value;
        aliases.set(name, dataSource.name);
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

const useScope = ({ variable }: { variable?: DataSource }) => {
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
            const { scope, aliases } = getResourceScopeForInstance({
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
            if (variable) {
              delete newScope[encodeDataVariableId(variable.id)];
            }
            return { scope: newScope, aliases };
          }
        ),
      [variable]
    )
  );
};

type PanelApi = {
  save: (formData: FormData) => void;
};

const validateBody = (
  value: string,
  contentType: unknown,
  scope: Record<string, unknown>
) => {
  // skip empty expressions
  if (value === "") {
    return "";
  }
  const evaluatedValue = evaluateExpressionWithinScope(value, scope);
  if (contentType === "application/json") {
    return typeof evaluatedValue === "object" && evaluatedValue !== null
      ? ""
      : "Expected valid JSON object in body";
  } else {
    return typeof evaluatedValue === "string" ? "" : "Expected string in body";
  }
};

const BodyField = ({
  scope,
  aliases,
  contentType,
  value,
  onChange,
}: {
  aliases: Map<string, string>;
  scope: Record<string, unknown>;
  contentType: unknown;
  value: string;
  onChange: (value: string) => void;
}) => {
  const [isBodyLiteral, setIsBodyLiteral] = useState(
    () => value === "" || isLiteralExpression(value)
  );
  const [bodyError, setBodyError] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    bodyRef.current?.setCustomValidity(validateBody(value, contentType, scope));
    setBodyError("");
  }, [value, contentType, scope]);

  return (
    <Grid gap={1}>
      <Label>Body</Label>
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
      <BindingControl>
        <InputErrorsTooltip errors={bodyError ? [bodyError] : undefined}>
          {contentType === "application/json" ? (
            // wrap with div to position error tooltip
            <div>
              <ExpressionEditor
                color={bodyError ? "error" : undefined}
                // expressions with variables cannot be edited
                readOnly={isBodyLiteral === false}
                value={
                  isBodyLiteral
                    ? value
                    : (JSON.stringify(
                        evaluateExpressionWithinScope(value, scope),
                        null,
                        2
                      ) ?? "")
                }
                onChange={onChange}
                onChangeComplete={() => bodyRef.current?.checkValidity()}
              />
            </div>
          ) : (
            <TextArea
              autoGrow={true}
              maxRows={10}
              // expressions with variables cannot be edited
              disabled={isBodyLiteral === false}
              color={bodyError ? "error" : undefined}
              value={String(evaluateExpressionWithinScope(value, scope) ?? "")}
              // update text value as string literal
              onChange={(newValue) => onChange(JSON.stringify(newValue))}
              onBlur={() => bodyRef.current?.checkValidity()}
            />
          )}
        </InputErrorsTooltip>
        <BindingPopover
          scope={scope}
          aliases={aliases}
          variant={isBodyLiteral ? "default" : "bound"}
          value={value}
          onChange={(value) => {
            onChange(value);
            setIsBodyLiteral(isLiteralExpression(value));
          }}
          onRemove={(evaluatedValue) => {
            onChange(JSON.stringify(evaluatedValue));
            setIsBodyLiteral(true);
          }}
        />
      </BindingControl>
    </Grid>
  );
};

const isContentTypeHeader = (header: Resource["headers"][number]) =>
  header.name.toLowerCase() === "content-type";

export const ResourceForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource }
>(({ variable }, ref) => {
  const { scope, aliases } = useScope({ variable });

  const resources = useStore($resources);
  const resource =
    variable?.type === "resource"
      ? resources.get(variable.resourceId)
      : undefined;

  const [url, setUrl] = useState(resource?.url ?? `""`);
  const [method, setMethod] = useState<Resource["method"]>(
    resource?.method ?? "get"
  );
  const [searchParams, setSearchParams] = useState(
    resource?.searchParams ?? []
  );
  const [headers, setHeaders] = useState<Resource["headers"]>(
    resource?.headers ?? []
  );
  const [body, setBody] = useState(() => resource?.body);

  const contentType = headers.find(isContentTypeHeader)?.value;
  const evaluatedContentType = contentType
    ? evaluateExpressionWithinScope(contentType, scope)
    : undefined;

  useImperativeHandle(ref, () => ({
    save: (formData) => {
      // preserve existing instance scope when edit
      const scopeInstanceId =
        variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
      if (scopeInstanceId === undefined) {
        return;
      }
      const name = z.string().parse(formData.get("name"));
      const newResource = parseResource({
        id: resource?.id ?? nanoid(),
        name,
        formData,
      });
      const newVariable: DataSource = {
        id: variable?.id ?? nanoid(),
        scopeInstanceId,
        name,
        type: "resource",
        resourceId: newResource.id,
      };
      updateWebstudioData((data) => {
        data.dataSources.set(newVariable.id, newVariable);
        data.resources.set(newResource.id, newResource);
        rebindTreeVariablesMutable({
          startingInstanceId: scopeInstanceId,
          ...data,
        });
      });
    },
  }));

  return (
    <>
      <MethodField value={method} onChange={setMethod} />
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
          setHeaders(
            curl.headers.map((header) => ({
              name: header.name,
              value: JSON.stringify(header.value),
            }))
          );
          setBody(JSON.stringify(curl.body));
        }}
      />
      <SearchParams
        scope={scope}
        aliases={aliases}
        searchParams={searchParams}
        onChange={setSearchParams}
      />
      <Headers
        scope={scope}
        aliases={aliases}
        headers={headers}
        onChange={setHeaders}
      />
      {method !== "get" && (
        <BodyField
          scope={scope}
          aliases={aliases}
          contentType={evaluatedContentType}
          value={body ?? ""}
          onChange={(newBody) => {
            const evaluatedValue = evaluateExpressionWithinScope(
              newBody,
              scope
            );
            // automatically add Content-Type: application/json header
            // when value is object
            if (
              typeof evaluatedValue === "object" &&
              evaluatedValue !== null &&
              evaluatedContentType !== "application/json"
            ) {
              setHeaders((prevHeaders) => {
                const newHeaders = prevHeaders.filter(isContentTypeHeader);
                newHeaders.push({
                  name: "Content-Type",
                  value: JSON.stringify("application/json"),
                });
                return newHeaders;
              });
            }
            setBody(newBody);
          }}
        />
      )}
    </>
  );
});
ResourceForm.displayName = "ResourceForm";

export const SystemResourceForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource }
>(({ variable }, ref) => {
  const resources = useStore($resources);

  const resource =
    variable?.type === "resource"
      ? resources.get(variable.resourceId)
      : undefined;

  const method = "get";

  const localResources = [
    {
      label: "Sitemap",
      value: JSON.stringify(sitemapResourceUrl),
      description: "Resource that loads the sitemap data of the current site.",
    },
  ];

  const [localResource, setLocalResource] = useState(() => {
    return (
      localResources.find(
        (localResource) => localResource.value === resource?.url
      ) ?? localResources[0]
    );
  });

  useImperativeHandle(ref, () => ({
    save: (formData) => {
      // preserve existing instance scope when edit
      const scopeInstanceId =
        variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
      if (scopeInstanceId === undefined) {
        return;
      }
      const name = z.string().parse(formData.get("name"));
      const newResource: Resource = {
        id: resource?.id ?? nanoid(),
        name,
        control: "system",
        url: localResource.value,
        method,
        headers: [],
      };
      const newVariable: DataSource = {
        id: variable?.id ?? nanoid(),
        scopeInstanceId,
        name,
        type: "resource",
        resourceId: newResource.id,
      };
      updateWebstudioData((data) => {
        data.dataSources.set(newVariable.id, newVariable);
        data.resources.set(newResource.id, newResource);
        rebindTreeVariablesMutable({
          startingInstanceId: scopeInstanceId,
          ...data,
        });
      });
    },
  }));

  const resourceId = useId();

  return (
    <>
      <Flex direction="column" css={{ gap: theme.spacing[3] }}>
        <Label htmlFor={resourceId}>Resource</Label>
        <Select
          options={localResources}
          getLabel={(option) => option.label}
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
      </Flex>
    </>
  );
});
SystemResourceForm.displayName = "SystemResourceForm";

const zGraphqlBody = z.object({
  query: z.string(),
  variables: z.optional(z.record(z.unknown())),
});

export const GraphqlResourceForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource }
>(({ variable }, ref) => {
  const { scope, aliases } = useScope({ variable });

  const resources = useStore($resources);
  const resource =
    variable?.type === "resource"
      ? resources.get(variable.resourceId)
      : undefined;

  const [url, setUrl] = useState(resource?.url ?? `""`);
  const [headers, setHeaders] = useState(
    resource?.headers ?? [
      { name: "Content-Type", value: JSON.stringify("application/json") },
    ]
  );

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
      const name = z.string().parse(formData.get("name"));
      const body = generateObjectExpression(
        new Map([
          ["query", JSON.stringify(query)],
          ["variables", variables],
        ])
      );
      const newResource: Resource = {
        id: resource?.id ?? nanoid(),
        name,
        control: "graphql",
        url,
        method: "post",
        headers,
        body,
      };
      const newVariable: DataSource = {
        id: variable?.id ?? nanoid(),
        scopeInstanceId,
        name,
        type: "resource",
        resourceId: newResource.id,
      };
      updateWebstudioData((data) => {
        data.dataSources.set(newVariable.id, newVariable);
        data.resources.set(newResource.id, newResource);
        rebindTreeVariablesMutable({
          startingInstanceId: scopeInstanceId,
          ...data,
        });
      });
    },
  }));

  return (
    <>
      <UrlField
        scope={scope}
        aliases={aliases}
        value={url}
        onChange={setUrl}
        onCurlPaste={(curl) => {
          // update all feilds when curl is paste into url field
          setUrl(JSON.stringify(curl.url));
          setHeaders(
            curl.headers.map((header) => ({
              name: header.name,
              value: JSON.stringify(header.value),
            }))
          );
          const body = zGraphqlBody.safeParse(curl.body);
          if (body.success) {
            setQuery(body.data.query);
            setVariables(JSON.stringify(body.data.variables, null, 2));
          }
        }}
      />

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
            content={<TextArea grow={true} value={query} onChange={setQuery} />}
          >
            <EditorDialogButton />
          </EditorDialog>
        </EditorDialogControl>
      </Grid>

      <Grid gap={1}>
        <Label>GraphQL Variables</Label>
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
        <BindingControl>
          <InputErrorsTooltip
            errors={variablesError ? [variablesError] : undefined}
          >
            {/* wrap with div to position error tooltip */}
            <div>
              <ExpressionEditor
                color={variablesError ? "error" : undefined}
                readOnly={isVariablesLiteral === false}
                value={
                  isVariablesLiteral
                    ? variables
                    : (JSON.stringify(
                        evaluateExpressionWithinScope(variables, scope),
                        null,
                        2
                      ) ?? "")
                }
                onChange={setVariables}
                onChangeComplete={() => variablesRef.current?.checkValidity()}
              />
            </div>
          </InputErrorsTooltip>
          <BindingPopover
            scope={scope}
            aliases={aliases}
            variant={isVariablesLiteral ? "default" : "bound"}
            value={variables}
            onChange={(value) => {
              setVariables(value);
              setIsVariablesLiteral(isLiteralExpression(value));
            }}
            onRemove={(evaluatedValue) => {
              setVariables(JSON.stringify(evaluatedValue));
              setIsVariablesLiteral(true);
            }}
          />
        </BindingControl>
      </Grid>

      <Headers
        scope={scope}
        aliases={aliases}
        headers={headers}
        onChange={setHeaders}
      />
    </>
  );
});
GraphqlResourceForm.displayName = "GraphqlResourceForm";
