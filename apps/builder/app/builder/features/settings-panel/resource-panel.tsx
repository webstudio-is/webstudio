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
import type { DataSource, Resource } from "@webstudio-is/sdk";
import {
  encodeDataSourceVariable,
  isLiteralExpression,
  sitemapResourceUrl,
} from "@webstudio-is/sdk";
import {
  Box,
  Button,
  Flex,
  Grid,
  InputErrorsTooltip,
  InputField,
  Label,
  Select,
  SmallIconButton,
  TextArea,
  Tooltip,
  theme,
} from "@webstudio-is/design-system";
import { DeleteIcon, InfoCircleIcon, PlusIcon } from "@webstudio-is/icons";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { humanizeString } from "~/shared/string-utils";
import { serverSyncStore } from "~/shared/sync";
import {
  $dataSources,
  $resources,
  $selectedInstanceSelector,
  $selectedPage,
  $variableValuesByInstanceSelector,
} from "~/shared/nano-states";
import {
  BindingControl,
  BindingPopover,
  evaluateExpressionWithinScope,
} from "~/builder/shared/binding-popover";
import {
  type Field,
  type ComposedFields,
  useField,
  composeFields,
} from "~/shared/form-utils";
import { ExpressionEditor } from "~/builder/shared/expression-editor";
import { parseCurl, type CurlRequest } from "./curl";

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

const UrlField = ({
  scope,
  aliases,
  value,
  onChange,
  onCurlPaste,
}: {
  aliases: Map<string, string>;
  scope: Record<string, unknown>;
  value: string;
  onChange: (value: string) => void;
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
      <BindingControl>
        <InputErrorsTooltip errors={error ? [error] : undefined}>
          <TextArea
            ref={ref}
            name="url"
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
              } else {
                // update text value as string literal
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

const validateHeaderName = (value: string) =>
  value.trim().length === 0 ? "Header name is required" : "";

const validateHeaderValue = (value: string, scope: Record<string, unknown>) => {
  const evaluatedValue = evaluateExpressionWithinScope(value, scope);
  if (typeof evaluatedValue !== "string") {
    return "Header value expects a string";
  }
  if (evaluatedValue.length === 0) {
    return "Header value is required";
  }
  return "";
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
  const nameId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [nameError, setNameError] = useState("");
  // revalidate and hide error message
  // until validity is checks again
  useEffect(() => {
    nameRef.current?.setCustomValidity(validateHeaderName(name));
    setNameError("");
  }, [name]);

  const valueId = useId();
  const valueRef = useRef<HTMLInputElement>(null);
  const [valueError, setValueError] = useState("");
  useEffect(() => {
    valueRef.current?.setCustomValidity(validateHeaderValue(value, scope));
    setValueError("");
  }, [value, scope]);

  return (
    <Grid
      gap={2}
      align={"center"}
      css={{
        gridTemplateColumns: `${theme.spacing[18]} 1fr 19px`,
        gridTemplateAreas: `
         "name name-input button"
         "value  value-input  button"
        `,
      }}
    >
      <Label htmlFor={nameId} css={{ gridArea: "name" }}>
        Name
      </Label>
      <InputErrorsTooltip errors={nameError ? [nameError] : undefined}>
        <InputField
          inputRef={nameRef}
          name="header-name"
          css={{ gridArea: "name-input" }}
          id={nameId}
          color={nameError ? "error" : undefined}
          value={name}
          onChange={(event) => onChange(event.target.value, value)}
          // can't use event.currentTarget because InputField
          // binds focus events to container instead of input
          onBlur={() => nameRef.current?.checkValidity()}
          onInvalid={(event) =>
            setNameError(event.currentTarget.validationMessage)
          }
        />
      </InputErrorsTooltip>
      <Label htmlFor={valueId} css={{ gridArea: "value" }}>
        Value
      </Label>
      <Box css={{ gridArea: "value-input", position: "relative" }}>
        <BindingControl>
          <InputErrorsTooltip errors={valueError ? [valueError] : undefined}>
            <InputField
              inputRef={valueRef}
              name="header-value"
              id={valueId}
              // expressions with variables cannot be edited
              disabled={isLiteralExpression(value) === false}
              color={valueError ? "error" : undefined}
              value={String(evaluateExpressionWithinScope(value, scope))}
              // update text value as string literal
              onChange={(event) =>
                onChange(name, JSON.stringify(event.target.value))
              }
              onBlur={() => valueRef.current?.checkValidity()}
              onInvalid={(event) =>
                setValueError(event.currentTarget.validationMessage)
              }
            />
          </InputErrorsTooltip>
          <BindingPopover
            scope={scope}
            aliases={aliases}
            variant={isLiteralExpression(value) ? "default" : "bound"}
            value={value}
            onChange={(newValue) => onChange(name, newValue)}
            onRemove={(evaluatedValue) =>
              onChange(name, JSON.stringify(evaluatedValue))
            }
          />
        </BindingControl>
      </Box>

      <Grid
        css={{
          gridArea: "button",
          justifyItems: "center",
          gap: "2px",
          color: theme.colors.foregroundIconSecondary,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="19"
          height="11"
          viewBox="0 0 19 11"
          fill="currentColor"
        >
          <path d="M10 10.05V6.05005C10 2.73634 7.31371 0.0500488 4 0.0500488H0V1.05005H4C6.76142 1.05005 9 3.28863 9 6.05005V10.05H10Z" />
        </svg>
        <SmallIconButton
          variant="destructive"
          icon={<DeleteIcon />}
          onClick={onDelete}
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="19"
          height="11"
          viewBox="0 0 19 11"
          fill="currentColor"
        >
          <path d="M-4.37114e-07 10.05L4 10.05C7.31371 10.05 10 7.36376 10 4.05005L10 0.0500488L9 0.0500488L9 4.05005C9 6.81147 6.76142 9.05005 4 9.05005L-3.93402e-07 9.05005L-4.37114e-07 10.05Z" />
        </svg>
      </Grid>
    </Grid>
  );
};

const Headers = ({
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
    <Grid gap={3}>
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
      <Button
        type="button"
        color="neutral"
        css={{ justifySelf: "center" }}
        prefix={<PlusIcon />}
        onClick={() => {
          // use empty string expression as default
          const newHeaders = [...headers, { name: "", value: `""` }];
          onChange(newHeaders);
        }}
      >
        Add another header pair
      </Button>
    </Grid>
  );
};

const $hiddenDataSourceIds = computed(
  [$dataSources, $selectedPage],
  (dataSources, page) => {
    const dataSourceIds = new Set<DataSource["id"]>();
    for (const dataSource of dataSources.values()) {
      // hide collection item and component parameters from resources
      // to prevent waterfall and loop requests ans not complicate compiler
      if (dataSource.type === "parameter") {
        dataSourceIds.add(dataSource.id);
      }
      // prevent resources using data of other resources
      if (dataSource.type === "resource") {
        dataSourceIds.add(dataSource.id);
      }
    }
    if (page && isFeatureEnabled("filters")) {
      dataSourceIds.delete(page.systemDataSourceId);
    }
    return dataSourceIds;
  }
);

const $selectedInstanceScope = computed(
  [
    $selectedInstanceSelector,
    $variableValuesByInstanceSelector,
    $dataSources,
    $hiddenDataSourceIds,
  ],
  (
    instanceSelector,
    variableValuesByInstanceSelector,
    dataSources,
    hiddenDataSourceIds
  ) => {
    const scope: Record<string, unknown> = {};
    const aliases = new Map<string, string>();
    if (instanceSelector === undefined) {
      return { scope, aliases };
    }
    const values = variableValuesByInstanceSelector.get(
      JSON.stringify(instanceSelector)
    );
    if (values) {
      for (const [dataSourceId, value] of values) {
        if (hiddenDataSourceIds.has(dataSourceId)) {
          continue;
        }
        const dataSource = dataSources.get(dataSourceId);
        if (dataSource === undefined) {
          continue;
        }
        const name = encodeDataSourceVariable(dataSourceId);
        scope[name] = value;
        aliases.set(name, dataSource.name);
      }
    }
    return { scope, aliases };
  }
);

const BodyField = ({
  editorAliases,
  editorScope,
  contentType,
  bodyField,
}: {
  editorAliases: Map<string, string>;
  editorScope: Record<string, unknown>;
  contentType?: string;
  bodyField: Field<undefined | string>;
}) => {
  const evaluatedBodyValue =
    bodyField.value === undefined
      ? undefined
      : evaluateExpressionWithinScope(bodyField.value, editorScope);
  const evaluatedContentType = contentType
    ? evaluateExpressionWithinScope(contentType, editorScope)
    : undefined;
  const isBound =
    bodyField.value !== undefined &&
    isLiteralExpression(bodyField.value) === false;
  const isJsonBody = String(evaluatedContentType ?? "") === "application/json";

  const [localValue, setLocalValue] = useState<undefined | string>();

  return (
    <Flex direction="column" css={{ gap: theme.spacing[3] }}>
      <Label>Body</Label>
      <BindingControl>
        <InputErrorsTooltip
          errors={bodyField.error ? [bodyField.error] : undefined}
        >
          {isJsonBody ? (
            // wrap with div to position error tooltip
            <div>
              <ExpressionEditor
                color={bodyField.error ? "error" : undefined}
                // expressions with variables cannot be edited
                readOnly={
                  localValue === undefined && isBound && bodyField.valid
                }
                value={
                  localValue ??
                  JSON.stringify(evaluatedBodyValue, null, 2) ??
                  bodyField.value ??
                  ""
                }
                onChange={(value) => {
                  setLocalValue(value);
                  bodyField.onChange(value);
                }}
                onBlur={() => {
                  setLocalValue(undefined);
                  bodyField.onBlur();
                }}
              />
            </div>
          ) : (
            <TextArea
              autoGrow={true}
              maxRows={10}
              // expressions with variables cannot be edited
              disabled={isBound}
              color={bodyField.error ? "error" : undefined}
              value={String(evaluatedBodyValue ?? "")}
              // update text value as string literal
              onChange={(newValue) =>
                bodyField.onChange(JSON.stringify(newValue))
              }
              onBlur={bodyField.onBlur}
            />
          )}
        </InputErrorsTooltip>
        <BindingPopover
          scope={editorScope}
          aliases={editorAliases}
          variant={isBound ? "bound" : "default"}
          value={bodyField.value ?? ""}
          onChange={(value) => {
            bodyField.onChange(value);
            bodyField.onBlur();
          }}
          onRemove={(evaluatedValue) => {
            bodyField.onChange(JSON.stringify(evaluatedValue));
            bodyField.onBlur();
          }}
        />
      </BindingControl>
    </Flex>
  );
};

type PanelApi = ComposedFields & {
  save: () => void;
};

export const ResourceForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource; nameField: Field<string> }
>(({ variable, nameField }, ref) => {
  const { scope: scopeWithCurrentVariable, aliases } = useStore(
    $selectedInstanceScope
  );
  const currentVariableId = variable?.id;
  // prevent showing currently edited variable in suggestions
  // to avoid cirular dependeny
  const scope = useMemo(() => {
    if (currentVariableId === undefined) {
      return scopeWithCurrentVariable;
    }
    const newScope: Record<string, unknown> = { ...scopeWithCurrentVariable };
    delete newScope[encodeDataSourceVariable(currentVariableId)];
    return newScope;
  }, [scopeWithCurrentVariable, currentVariableId]);

  const resources = useStore($resources);
  const resource =
    variable?.type === "resource"
      ? resources.get(variable.resourceId)
      : undefined;

  const [url, setUrl] = useState(resource?.url ?? `""`);
  const [method, setMethod] = useState<Resource["method"]>(
    resource?.method ?? "get"
  );
  const [headers, setHeaders] = useState<Resource["headers"]>(
    resource?.headers ?? []
  );
  const bodyField = useField<undefined | string>({
    initialValue: resource?.body,
    validate: (value) => {
      // skip empty expressions
      if (value === undefined) {
        return;
      }
      const evaluatedValue = evaluateExpressionWithinScope(value, scope);
      const isString = typeof evaluatedValue === "string";
      const isJson =
        typeof evaluatedValue === "object" && evaluatedValue !== null;
      if (isString === false && isJson === false) {
        return "Body expects a string or json";
      }
    },
  });

  const form = composeFields(nameField, bodyField);
  const formAccessorRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({
    isValid() {
      const formElement = formAccessorRef.current?.form;
      return form.isValid() && formElement?.checkValidity() === true;
    },
    areAllErrorsVisible() {
      const formElement = formAccessorRef.current?.form;
      // check all errors in form fields are visible
      if (formElement) {
        for (const element of formElement.elements) {
          if (
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement
          ) {
            // field is invalid and the error is not visible
            if (
              element.validity.valid === false &&
              // rely on data-color=error convention in webstudio design system
              element.getAttribute("data-color") !== "error"
            ) {
              return false;
            }
          }
        }
      }
      return form.areAllErrorsVisible();
    },
    showAllErrors() {
      const formElement = formAccessorRef.current?.form;
      formElement?.checkValidity();
      form.showAllErrors();
    },
    save: () => {
      const instanceSelector = $selectedInstanceSelector.get();
      if (instanceSelector === undefined) {
        return;
      }
      const [instanceId] = instanceSelector;
      const newResource: Resource = {
        id: resource?.id ?? nanoid(),
        name: nameField.value,
        url,
        method,
        headers,
        body: bodyField.value,
      };
      const newVariable: DataSource = {
        id: variable?.id ?? nanoid(),
        // preserve existing instance scope when edit
        scopeInstanceId: variable?.scopeInstanceId ?? instanceId,
        name: nameField.value,
        type: "resource",
        resourceId: newResource.id,
      };
      serverSyncStore.createTransaction(
        [$dataSources, $resources],
        (dataSources, resources) => {
          dataSources.set(newVariable.id, newVariable);
          resources.set(newResource.id, newResource);
        }
      );
    },
  }));

  return (
    <>
      <input ref={formAccessorRef} type="hidden" name="form-accessor" />
      <UrlField
        scope={scope}
        aliases={aliases}
        value={url}
        onChange={setUrl}
        onCurlPaste={(curl) => {
          // update all feilds when curl is paste into url field
          setUrl(JSON.stringify(curl.url));
          setMethod(curl.method);
          setHeaders(
            curl.headers.map((header) => ({
              name: header.name,
              value: JSON.stringify(header.value),
            }))
          );
          bodyField.onChange(JSON.stringify(curl.body));
        }}
      />
      <Grid gap={1}>
        <Label>Method</Label>
        <Select<Resource["method"]>
          options={["get", "post", "put", "delete"]}
          getLabel={humanizeString}
          value={method}
          onChange={(newValue) => setMethod(newValue)}
        />
      </Grid>
      <Grid gap={1}>
        <Label>Headers</Label>
        <Headers
          scope={scope}
          aliases={aliases}
          headers={headers}
          onChange={setHeaders}
        />
      </Grid>
      {method !== "get" && (
        <BodyField
          editorScope={scope}
          editorAliases={aliases}
          contentType={
            headers.find(
              (header) => header.name.toLowerCase() === "content-type"
            )?.value
          }
          bodyField={bodyField}
        />
      )}
    </>
  );
});
ResourceForm.displayName = "ResourceForm";

export const SystemResourceForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource; nameField: Field<string> }
>(({ variable, nameField }, ref) => {
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

  const form = composeFields(nameField);

  useImperativeHandle(ref, () => ({
    ...form,
    save: () => {
      const instanceSelector = $selectedInstanceSelector.get();
      if (instanceSelector === undefined) {
        return;
      }
      const [instanceId] = instanceSelector;

      const newResource: Resource = {
        id: resource?.id ?? nanoid(),
        name: nameField.value,
        control: "system",
        url: localResource.value,
        method,
        headers: [],
      };

      const newVariable: DataSource = {
        id: variable?.id ?? nanoid(),
        // preserve existing instance scope when edit
        scopeInstanceId: variable?.scopeInstanceId ?? instanceId,
        name: nameField.value,
        type: "resource",
        resourceId: newResource.id,
      };

      serverSyncStore.createTransaction(
        [$dataSources, $resources],
        (dataSources, resources) => {
          dataSources.set(newVariable.id, newVariable);
          resources.set(newResource.id, newResource);
        }
      );
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
SystemResourceForm.displayName = "ResourceForm";
