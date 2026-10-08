import {
  $previewFormExchanges,
  $resourcePreviewExchanges,
} from "~/shared/preview-form-inspection";
import {
  $livePreviewFormValues,
  $livePreviewBrowserInfo,
  getFormOccurrenceKey,
} from "~/shared/preview-form-values";
import { z } from "zod";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { javascript } from "@codemirror/lang-javascript";
import {
  type ReactNode,
  type Ref,
  type RefObject,
  forwardRef,
  useId,
  useState,
  useImperativeHandle,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { AlertIcon, RefreshIcon } from "@webstudio-is/icons";
import {
  Button,
  Combobox,
  cssVar,
  DialogClose,
  DialogMaximize,
  DialogTitle,
  DialogTitleActions,
  Flex,
  FloatingPanel,
  Grid,
  InputErrorsTooltip,
  InputField,
  Label,
  ProChip,
  ScrollArea,
  Select,
  SplitView,
  Switch,
  TextArea,
  Tooltip,
  theme,
} from "@webstudio-is/design-system";
import {
  type DataSource,
  type ResourceRequest,
  SYSTEM_VARIABLE_ID,
  hasAssetsResourceUrl,
  resourceRequest,
} from "@webstudio-is/sdk";
import {
  browserInfoParameterName,
  formDataParameterName,
  isAssetsResourceRequest,
  currentDateResourceUrl,
} from "@webstudio-is/sdk/runtime";
import {
  ExpressionEditor,
  formatValue,
} from "~/builder/shared/expression-editor";
import {
  $permissions,
  $variableValuesByInstanceSelector,
  $selectedInstanceSelector,
} from "~/shared/nano-states";
import { $dataSources } from "~/shared/sync/data-stores";
import { $resources, $instances, $props } from "~/shared/sync/data-stores";
import {
  getBrowserInfoPreview,
  getFormDataPreview,
} from "./form-context-preview";
import {
  $selectedInstance,
  $selectedInstanceKeyWithRoot,
} from "~/shared/nano-states";
import { $variableToOpen } from "./variable-navigation";
import {
  EditorContent,
  EditorDialog,
  EditorDialogButton,
  EditorDialogControl,
  foldGutterExtension,
} from "~/shared/code-editor-base";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import {
  findAvailableVariables,
  createDataVariableValueFromInput,
  createResourceValueFromFormData,
  findUnsetVariableNames,
  validateDataVariableJsonValue,
  validateDataVariableNumberValue,
} from "@webstudio-is/project-build/runtime";
import { parseJsonExpression } from "@webstudio-is/expression";
import { validateDataVariableName } from "~/builder/shared/data-variable-utils";
import {
  GraphqlResourceForm,
  ResourceForm,
  SystemResourceForm,
  useResourceScope,
} from "./resource-panel";
import {
  $pendingResourceKeys,
  $resourceDiagnosticsCache,
  $resourceDiagnosticsErrorCache,
  $resourcePerformanceCache,
  $resourcesCache,
  computeResourceRequest,
  getResourceKey,
  loadResourcePreview,
  loadResourceDiagnostics,
} from "~/shared/resources";
import { Row } from "./shared";
import type { AssetQueryPreviewDiagnostics } from "@webstudio-is/content-engine";
import {
  clearSettledDiagnosticsKey,
  RequestInspector,
} from "./request-inspector";
import {
  getRequestErrorDiagnostics,
  RequestErrorDiagnostics,
} from "./request-error-diagnostics";
import type { ResourcePerformance } from "~/shared/resource-diagnostics";
import { ResourceDiagnosticsView } from "./resource-diagnostics-view";
import { canDeleteVariable, VariableMenu } from "./variable-menu";

const NameField = ({
  variable,
  defaultValue,
}: {
  variable: undefined | DataSource;
  defaultValue: string;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const nameId = useId();
  const scopeInstanceId =
    variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
  const validateName = useCallback(
    (value: string) => {
      const error = validateDataVariableName(
        value,
        variable?.id,
        scopeInstanceId
      );
      return error?.message ?? "";
    },
    [variable, scopeInstanceId]
  );
  const [value, setValue] = useState(defaultValue);
  const instances = useStore($instances);
  const dataSources = useStore($dataSources);
  const shadowed = scopeInstanceId
    ? [
        ...findAvailableVariables({
          startingInstanceId: scopeInstanceId,
          instances,
          dataSources: new Map(
            [...dataSources].filter(
              ([, source]) => source.scopeInstanceId !== scopeInstanceId
            )
          ),
        }).values(),
      ].find(
        (source) =>
          source.scopeInstanceId !== scopeInstanceId && source.name === value
      )
    : undefined;
  useEffect(() => {
    ref.current?.setCustomValidity(validateName(value));
  }, [value, validateName]);
  return (
    <Grid gap={1}>
      <Flex gap="1" align="center">
        <Label htmlFor={nameId}>Name</Label>
        {shadowed && (
          <Tooltip
            content={`This name shadows a variable from ${instances.get(shadowed.scopeInstanceId ?? "")?.label ?? instances.get(shadowed.scopeInstanceId ?? "")?.component ?? "an ancestor"}. Both variables are allowed.`}
          >
            <AlertIcon color={cssVar("--foreground-warning")} />
          </Tooltip>
        )}
      </Flex>
      <InputErrorsTooltip errors={error ? [error] : undefined}>
        <Combobox<string>
          inputRef={ref}
          name="name"
          id={nameId}
          color={error ? "error" : undefined}
          itemToString={(item) => item ?? ""}
          getDescription={() => (
            <>
              Enter a new variable or select
              <br />
              a variable that has been used
              <br />
              in expressions but not yet created
            </>
          )}
          getItems={() => {
            // find unset variables for variable instance
            // and fallback to selected instance for new variables
            const scopeInstanceId =
              variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
            if (scopeInstanceId === undefined) {
              return [];
            }
            return findUnsetVariableNames({
              startingInstanceId: scopeInstanceId,
              instances: $instances.get(),
              props: $props.get(),
              dataSources: $dataSources.get(),
              resources: $resources.get(),
            });
          }}
          value={value}
          onItemSelect={(newValue) => {
            ref.current?.setCustomValidity(validateName(newValue));
            setValue(newValue);
            setError("");
          }}
          onChange={(newValue = "") => {
            ref.current?.setCustomValidity(validateName(newValue));
            setValue(newValue);
            setError("");
          }}
          onBlur={() => ref.current?.checkValidity()}
          onInvalid={(event) => setError(event.currentTarget.validationMessage)}
        />
      </InputErrorsTooltip>
    </Grid>
  );
};

type VariableType =
  | "parameter"
  | "string"
  | "number"
  | "boolean"
  | "json"
  | "resource"
  | "email-resource"
  | "graphql-resource"
  | "sitemap-resource"
  | "current-date-resource"
  | "assets-resource";

const TypeField = ({
  value,
  onChange,
}: {
  value: VariableType;
  onChange: (value: VariableType) => void;
}) => {
  const { allowDynamicData } = useStore($permissions);
  const getResourceTypeLabel = (label: string) => (
    <Flex direction="row" gap="2" align="center">
      {label}
      {allowDynamicData === false && <ProChip>Pro</ProChip>}
    </Flex>
  );
  const optionsList: Array<{
    value: VariableType;
    disabled?: boolean;
    label: ReactNode;
    description: string;
  }> = [
    {
      value: "string",
      label: "String",
      description: "Any alphanumeric text.",
    },
    {
      value: "number",
      label: "Number",
      description: "Any number, can be used in math expressions.",
    },
    {
      value: "boolean",
      label: "Boolean",
      description: "A boolean is a true/false switch.",
    },
    {
      value: "json",
      label: "JSON",
      description: "Any JSON value",
    },
    {
      value: "resource",
      label: getResourceTypeLabel("Resource"),
      description:
        "A REST resource is a configuration for secure data fetching. You can safely use secrets in any field.",
    },
    {
      value: "graphql-resource",
      label: getResourceTypeLabel("GraphQL"),
      description:
        "A GraphQL resource is a configuration for secure data fetching with GraphQL. You can safely use secrets in any field.",
    },
    {
      value: "sitemap-resource",
      label: getResourceTypeLabel("Sitemap"),
      description: "Resource that loads the sitemap data of the current site.",
    },
    {
      value: "current-date-resource",
      label: getResourceTypeLabel("Current date"),
      description:
        "Provides current date information (year, month, day) normalized to midnight UTC. Time components are set to 00:00:00 to prevent React hydration errors.",
    },
    {
      value: "assets-resource",
      label: getResourceTypeLabel("Assets"),
      description:
        "Loads all project assets by default, with optional filters, sorting, pagination, and file content.",
    },
    {
      value: "email-resource",
      label: getResourceTypeLabel("Email"),
      description:
        "Send a plain-text email through Webstudio Cloud when a Form is submitted.",
    },
  ];
  const options = new Map(optionsList.map((option) => [option.value, option]));

  return (
    <Grid gap="1">
      <Label>Type</Label>
      <Select
        options={Array.from(options.keys())}
        getLabel={(option: VariableType) => options.get(option)?.label}
        getItemProps={(option) => ({
          disabled: options.get(option)?.disabled,
        })}
        getDescription={(option) => options.get(option)?.description}
        value={value}
        name="type"
        onChange={onChange}
      />
    </Grid>
  );
};

type PanelApi = {
  save: (formData: FormData) => void | false | { dataSourceId: string };
};

const ParameterForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource }
>(({ variable }, ref) => {
  useImperativeHandle(ref, () => ({
    save: (formData) => {
      // only existing parameter variables can be renamed
      if (variable?.scopeInstanceId === undefined) {
        return;
      }
      const scopeInstanceId = variable.scopeInstanceId;
      const name = z.string().parse(formData.get("name"));
      executeRuntimeMutation({
        id: "variables.update",
        input: {
          dataSourceId: variable.id,
          values: { scopeInstanceId, name },
        },
      });
    },
  }));
  return <></>;
});
ParameterForm.displayName = "ParameterForm";

type ValueVariableType = Extract<
  VariableType,
  "string" | "number" | "boolean" | "json"
>;

const saveVariable = (
  variable: undefined | DataSource,
  type: ValueVariableType,
  formData: FormData
) => {
  // preserve existing instance scope when edit
  const scopeInstanceId =
    variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
  if (scopeInstanceId === undefined) {
    return;
  }
  const name = z.string().parse(formData.get("name"));
  const value = z.string().nullable().parse(formData.get("value"));
  const variableValue = createDataVariableValueFromInput({ type, value });
  if (variable === undefined) {
    executeRuntimeMutation({
      id: "variables.create",
      input: {
        scopeInstanceId,
        name,
        value: variableValue,
      },
    });
  } else {
    executeRuntimeMutation({
      id: "variables.update",
      input: {
        dataSourceId: variable.id,
        values: {
          scopeInstanceId,
          name,
          value: variableValue,
        },
      },
    });
  }
};

const useValuePanelRef = ({
  ref,
  variable,
  type,
}: {
  ref: Ref<undefined | PanelApi>;
  variable?: DataSource;
  type: ValueVariableType;
}) => {
  useImperativeHandle(ref, () => ({
    save: (formData) => {
      saveVariable(variable, type, formData);
    },
  }));
};

const StringForm = forwardRef<
  undefined | PanelApi,
  {
    variable?: DataSource;
    value: unknown;
    onChange: (value: unknown) => void;
  }
>(({ variable, value: unknownValue, onChange }, ref) => {
  const value = typeof unknownValue === "string" ? unknownValue : "";
  useValuePanelRef({ ref, variable, type: "string" });
  const valueId = useId();
  return (
    <Flex direction="column" css={{ gap: theme.spacing[3] }}>
      <Label htmlFor={valueId}>Value</Label>
      <EditorDialogControl>
        <TextArea
          name="value"
          rows={1}
          maxRows={10}
          autoGrow={true}
          id={valueId}
          value={value}
          onChange={onChange}
        />
        <EditorDialog
          title="Variable value"
          content={
            <TextArea
              grow={true}
              id={valueId}
              value={value}
              onChange={onChange}
            />
          }
        >
          <EditorDialogButton />
        </EditorDialog>
      </EditorDialogControl>
    </Flex>
  );
});
StringForm.displayName = "StringForm";

const NumberForm = forwardRef<
  undefined | PanelApi,
  {
    variable?: DataSource;
    value: unknown;
    onChange: (value: unknown) => void;
  }
>(({ variable, value: unknownValue, onChange }, ref) => {
  const value =
    typeof unknownValue === "number" || typeof unknownValue === "string"
      ? unknownValue
      : "";
  const [valueError, setValueError] = useState("");
  const valueRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    valueRef.current?.setCustomValidity(validateDataVariableNumberValue(value));
    setValueError("");
  }, [value]);
  useValuePanelRef({ ref, variable, type: "number" });
  const valueId = useId();
  return (
    <>
      <Flex direction="column" css={{ gap: theme.spacing[3] }}>
        <Label htmlFor={valueId}>Value</Label>
        <InputErrorsTooltip errors={valueError ? [valueError] : undefined}>
          <InputField
            inputRef={valueRef}
            name="value"
            id={valueId}
            inputMode="numeric"
            color={valueError ? "error" : undefined}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={() => valueRef.current?.checkValidity()}
            onInvalid={(event) =>
              setValueError(event.currentTarget.validationMessage)
            }
          />
        </InputErrorsTooltip>
      </Flex>
    </>
  );
});
NumberForm.displayName = "NumberForm";

const BooleanForm = forwardRef<
  undefined | PanelApi,
  {
    variable?: DataSource;
    value: unknown;
    onChange: (value: unknown) => void;
  }
>(({ variable, value: unknownValue, onChange }, ref) => {
  const value = typeof unknownValue === "boolean" ? unknownValue : false;
  useValuePanelRef({ ref, variable, type: "boolean" });
  const valueId = useId();
  return (
    <>
      <Flex direction="column" css={{ gap: theme.spacing[3] }}>
        <Label htmlFor={valueId}>Value</Label>
        <Switch
          name="value"
          value="on"
          id={valueId}
          checked={value}
          onCheckedChange={onChange}
        />
      </Flex>
    </>
  );
});
BooleanForm.displayName = "BooleanForm";

const JsonForm = forwardRef<
  undefined | PanelApi,
  {
    variable?: DataSource;
    value: unknown;
    onChange: (value: unknown) => void;
  }
>(({ variable, value: unknownValue, onChange }, ref) => {
  const value = typeof unknownValue === "string" ? unknownValue : "";
  const [valueError, setValueError] = useState("");
  const valueRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    valueRef.current?.setCustomValidity(validateDataVariableJsonValue(value));
    setValueError("");
  }, [value]);
  useValuePanelRef({ ref, variable, type: "json" });
  return (
    <>
      <input
        ref={valueRef}
        style={{ display: "none" }}
        name="value"
        data-color={valueError ? "error" : undefined}
        value={value}
        onChange={() => {}}
        onInvalid={(event) =>
          setValueError(event.currentTarget.validationMessage)
        }
      />
      <Flex direction="column" css={{ gap: theme.spacing[3] }}>
        <Label>Value</Label>
        <ExpressionEditor
          showLineNumbers
          color={valueError ? "error" : undefined}
          value={value}
          onChange={onChange}
          onChangeComplete={() => valueRef.current?.checkValidity()}
        />
      </Flex>
    </>
  );
});
JsonForm.displayName = "JsonForm";

const VariablePanelForm = forwardRef<
  undefined | PanelApi,
  {
    variable?: DataSource;
    variableType: VariableType;
    onVariableTypeChange: (variableType: VariableType) => void;
    value: unknown;
    onValueChange: (value: unknown) => void;
    onResourceChange: () => void;
    querySourceContainer: Element | null;
    onQueryActiveChange: (active: boolean) => void;
    onQueryPendingChange: (pending: boolean) => void;
  }
>(
  (
    {
      variable,
      variableType,
      onVariableTypeChange,
      value,
      onValueChange,
      onResourceChange,
      querySourceContainer,
      onQueryActiveChange,
      onQueryPendingChange,
    },
    ref
  ) => {
    return (
      <>
        <Flex
          direction="column"
          css={{
            overflow: "hidden",
            paddingBlock: theme.panel.paddingBlock,
            gap: theme.spacing[7],
          }}
        >
          <Row>
            <NameField
              variable={variable}
              defaultValue={variable?.name ?? ""}
            />
          </Row>
          {variableType !== "parameter" && (
            <Row>
              <TypeField value={variableType} onChange={onVariableTypeChange} />
            </Row>
          )}
          {variableType === "parameter" && (
            <ParameterForm ref={ref} variable={variable} />
          )}
          {variableType === "string" && (
            <Row>
              <StringForm
                ref={ref}
                variable={variable}
                value={value}
                onChange={onValueChange}
              />
            </Row>
          )}
          {variableType === "number" && (
            <Row>
              <NumberForm
                ref={ref}
                variable={variable}
                value={value}
                onChange={onValueChange}
              />
            </Row>
          )}
          {variableType === "boolean" && (
            <Row>
              <BooleanForm
                ref={ref}
                variable={variable}
                value={value}
                onChange={onValueChange}
              />
            </Row>
          )}
          {variableType === "json" && (
            <Row>
              <JsonForm
                ref={ref}
                variable={variable}
                value={value}
                onChange={onValueChange}
              />
            </Row>
          )}
          {variableType === "resource" && (
            <ResourceForm
              ref={ref}
              variable={variable}
              onChange={onResourceChange}
            />
          )}
          {variableType === "graphql-resource" && (
            <GraphqlResourceForm
              ref={ref}
              variable={variable}
              onChange={onResourceChange}
            />
          )}
          {(variableType === "sitemap-resource" ||
            variableType === "current-date-resource" ||
            variableType === "assets-resource" ||
            variableType === "email-resource") && (
            <SystemResourceForm
              ref={ref}
              resourceType={variableType}
              variable={variable}
              onChange={onResourceChange}
              querySourceContainer={querySourceContainer}
              onQueryActiveChange={onQueryActiveChange}
              onQueryPendingChange={onQueryPendingChange}
            />
          )}
        </Flex>
      </>
    );
  }
);
VariablePanelForm.displayName = "VariableForm";

const $instanceVariableValues = computed(
  [$selectedInstanceKeyWithRoot, $variableValuesByInstanceSelector],
  (instanceKey, variableValuesByInstanceSelector) =>
    variableValuesByInstanceSelector.get(instanceKey ?? "") ??
    new Map<string, unknown>()
);

const VariablePreview = ({
  variable,
  variableType,
  variableValue,
  showSavedResourceRequest,
  isComputingRequest,
  onLoadData,
  queryActive,
  queryPending,
  queryContainerRef,
}: {
  variable?: DataSource;
  variableType: VariableType;
  variableValue: unknown;
  showSavedResourceRequest: boolean;
  isComputingRequest: boolean;
  onLoadData: () => void;
  queryActive: boolean;
  queryPending: boolean;
  queryContainerRef: (element: HTMLDivElement | null) => void;
}) => {
  const [pendingDiagnosticsKey, setPendingDiagnosticsKey] = useState<string>();
  const isResource =
    variableType === "resource" ||
    variableType === "graphql-resource" ||
    variableType === "sitemap-resource" ||
    variableType === "current-date-resource" ||
    variableType === "assets-resource";
  const pendingResourceKeys = useStore($pendingResourceKeys);
  const resources = useStore($resources);
  const instances = useStore($instances);
  const props = useStore($props);
  const liveFormValues = useStore($livePreviewFormValues);
  const liveBrowserInfo = useStore($livePreviewBrowserInfo);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const variableValues = useStore($instanceVariableValues);
  const lastExchanges = useStore($previewFormExchanges);
  const resourceExchanges = useStore($resourcePreviewExchanges);
  const inspection =
    variable?.type === "resource"
      ? lastExchanges.get(variable.resourceId)
      : undefined;
  const formExchange = inspection?.attempts.at(-1);
  const resourcesCache = useStore($resourcesCache);
  const resourceDiagnosticsCache = useStore($resourceDiagnosticsCache);
  const resourceDiagnosticsErrorCache = useStore(
    $resourceDiagnosticsErrorCache
  );
  const resourcePerformanceCache = useStore($resourcePerformanceCache);
  const resourceScope = useResourceScope({ variable });
  const [resolvedResourceRequest, setResolvedResourceRequest] = useState<
    ResourceRequest | undefined
  >(() => resourceRequest.safeParse(variableValue).data);
  useEffect(() => {
    const parsedResourceRequest = resourceRequest.safeParse(variableValue).data;
    if (parsedResourceRequest !== undefined) {
      setResolvedResourceRequest(parsedResourceRequest);
      return;
    }
    if (
      variableType === "email-resource" ||
      variable?.type !== "resource" ||
      !showSavedResourceRequest
    ) {
      setResolvedResourceRequest(undefined);
      return;
    }
    const resource = resources.get(variable.resourceId);
    if (resource === undefined) {
      setResolvedResourceRequest(undefined);
      return;
    }
    let active = true;
    setResolvedResourceRequest(undefined);
    void computeResourceRequest(resource, resourceScope.variableValues)
      .then((request) => {
        if (active) {
          setResolvedResourceRequest(request);
        }
      })
      .catch(() => {
        if (active) {
          setResolvedResourceRequest(undefined);
        }
      });
    return () => {
      active = false;
    };
  }, [
    resources,
    resourceScope.variableValues,
    variable,
    variableType,
    variableValue,
    showSavedResourceRequest,
  ]);
  const parsedResourceRequest = resourceRequest.safeParse(variableValue).data;
  const computedResourceRequest =
    parsedResourceRequest ??
    (variable?.type === "resource" && showSavedResourceRequest
      ? resolvedResourceRequest
      : undefined);
  const previewPending =
    isComputingRequest ||
    (computedResourceRequest !== undefined &&
      pendingResourceKeys.has(getResourceKey(computedResourceRequest)));
  let computedValue: unknown;
  let resourceDiagnostics: AssetQueryPreviewDiagnostics | undefined;
  let resourcePerformance: ResourcePerformance | undefined;
  let resourceDiagnosticsError: unknown;
  let computedResourceKey: string | undefined;
  if (variableType === "string" || variableType === "boolean") {
    computedValue = variableValue;
  } else if (variableType === "json") {
    computedValue = parseJsonExpression(String(variableValue));
  } else if (variableType === "number") {
    computedValue = Number(variableValue);
    if (Number.isNaN(computedValue)) {
      computedValue = variableValue;
    }
  } else if (variableType === "parameter") {
    computedValue = variable
      ? (resourceScope.variableValues.get(variable.id) ??
        variableValues.get(variable.id))
      : undefined;
  } else {
    if (computedResourceRequest) {
      const resourceKey = getResourceKey(computedResourceRequest);
      computedResourceKey = resourceKey;
      computedValue = resourcesCache.get(resourceKey);
      resourceDiagnostics = resourceDiagnosticsCache.get(resourceKey);
      resourceDiagnosticsError = resourceDiagnosticsErrorCache.get(resourceKey);
      resourcePerformance = resourcePerformanceCache.get(resourceKey);
    }
  }
  const latestExchange =
    (computedResourceKey === undefined
      ? undefined
      : resourceExchanges.get(computedResourceKey)) ?? formExchange;
  const latestExchangeIsFormSubmission = latestExchange === formExchange;
  if (
    variableType === "parameter" &&
    variable?.type === "parameter" &&
    instances.get(variable.scopeInstanceId ?? "")?.component === "NativeForm"
  ) {
    if (variable.name === formDataParameterName) {
      computedValue =
        liveFormValues.get(
          getFormOccurrenceKey(
            selectedInstanceSelector,
            variable.scopeInstanceId!
          ) ?? ""
        ) ?? getFormDataPreview(instances, props, variable.scopeInstanceId!);
    } else if (variable.name === browserInfoParameterName) {
      computedValue = getBrowserInfoPreview(
        liveBrowserInfo.get(variable.scopeInstanceId ?? "")
      );
    }
  }
  if (latestExchange) {
    computedValue = {
      resourceId: latestExchange.resourceId,
      resourceName: latestExchange.resourceName,
      ...latestExchange.response,
      ok: latestExchange.outcome?.ok ?? latestExchange.response.status < 400,
      attempts: latestExchangeIsFormSubmission
        ? inspection?.attempts.map(
            ({ resourceId, resourceName, response, outcome }, index) => ({
              attempt: index + 1,
              resourceId,
              resourceName,
              ...response,
              ...(outcome === undefined ? {} : { outcome }),
            })
          )
        : undefined,
    };
  }
  const extensions = useMemo(() => [javascript({}), foldGutterExtension], []);
  const editorProps = {
    readOnly: true,
    chromeless: true,
    extensions,
    // compute value as json lazily only when dialog is open
    // by spliting into separate component which is invoked
    // only when dialog content is rendered
    value: formatValue(computedValue),
    onChange: () => {},
    onChangeComplete: () => {},
  };
  const previewContent = (
    <Grid
      align="stretch"
      css={{
        height: "100%",
        overflow: "hidden",
        boxSizing: "content-box",
        position: "relative",
        gridTemplateRows: "minmax(0, 1fr)",
      }}
    >
      <EditorContent {...editorProps} />
      {isResource && !computedValue && (
        <Flex
          justify="center"
          align="center"
          css={{ position: "absolute", inset: 0 }}
        >
          <Button type="button" disabled={previewPending} onClick={onLoadData}>
            {previewPending ? "Loading..." : "Load data"}
          </Button>
        </Flex>
      )}
    </Grid>
  );
  const inspectSubmission =
    variableType === "resource" ||
    variableType === "graphql-resource" ||
    variableType === "email-resource" ||
    latestExchange !== undefined;
  const alwaysShowRequestTab =
    variableType === "resource" || variableType === "graphql-resource";
  if (isResource === false && !inspectSubmission) {
    return previewContent;
  }
  const requestErrorDiagnostics = getRequestErrorDiagnostics(
    latestExchange
      ? latestExchange.outcome
        ? { ...latestExchange.outcome, data: latestExchange.outcome.body }
        : { ...latestExchange.response, data: latestExchange.response.body }
      : computedValue
  );
  const diagnosticsRequestError = getRequestErrorDiagnostics(
    resourceDiagnosticsError
  );
  const preview =
    requestErrorDiagnostics === undefined ? (
      previewContent
    ) : (
      <RequestErrorDiagnostics value={requestErrorDiagnostics} />
    );
  const requestSnapshot = latestExchange
    ? latestExchangeIsFormSubmission && inspection?.attempts.length
      ? inspection.attempts.map(
          ({ resourceId, resourceName, request, kind }, index) => ({
            attempt: index + 1,
            resourceId,
            resourceName,
            kind,
            ...request,
          })
        )
      : {
          resourceId: latestExchange.resourceId,
          resourceName: latestExchange.resourceName,
          ...latestExchange.request,
        }
    : undefined;
  return (
    <RequestInspector
      previewLabel={inspectSubmission ? "Response" : "Preview"}
      request={
        alwaysShowRequestTab || requestSnapshot !== undefined ? (
          requestSnapshot !== undefined ? (
            <EditorContent
              {...editorProps}
              value={formatValue(requestSnapshot)}
            />
          ) : null
        ) : undefined
      }
      queryContainerRef={queryActive ? queryContainerRef : undefined}
      preview={inspectSubmission ? previewContent : preview}
      queryPending={queryPending}
      previewPending={previewPending}
      onDiagnosticsOpen={
        computedResourceRequest !== undefined &&
        isAssetsResourceRequest(computedResourceRequest) &&
        resourceDiagnostics?.artifacts === undefined
          ? () => {
              const diagnosticsKey = getResourceKey(computedResourceRequest);
              setPendingDiagnosticsKey(diagnosticsKey);
              void loadResourceDiagnostics(computedResourceRequest).finally(
                () =>
                  setPendingDiagnosticsKey((pendingKey) =>
                    clearSettledDiagnosticsKey(pendingKey, diagnosticsKey)
                  )
              );
            }
          : undefined
      }
      diagnosticsPending={pendingDiagnosticsKey === computedResourceKey}
      diagnostics={
        <ResourceDiagnosticsView
          requestError={requestErrorDiagnostics}
          diagnosticsRequestError={diagnosticsRequestError}
          diagnostics={resourceDiagnostics}
          performance={resourcePerformance}
        />
      }
    />
  );
};

const VariablePopoverContent = ({
  formRef,
  variable,
  isOpen,
  onClose,
}: {
  formRef: RefObject<HTMLFormElement>;
  variable?: DataSource;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const panelRef = useRef<undefined | PanelApi>(undefined);
  const [queryActive, setQueryActive] = useState(false);
  const [queryPending, setQueryPending] = useState(false);
  const [querySourceContainer, setQuerySourceContainer] =
    useState<HTMLDivElement | null>(null);
  const queryContainerRef = useCallback(
    (element: HTMLDivElement | null) => setQuerySourceContainer(element),
    []
  );
  const isSystemVariable =
    variable?.id === SYSTEM_VARIABLE_ID ||
    (variable?.type === "parameter" &&
      (variable.name === formDataParameterName ||
        variable.name === browserInfoParameterName) &&
      $instances.get().get(variable.scopeInstanceId ?? "")?.component ===
        "NativeForm");
  const previewReleaseRef = useRef<(() => void) | undefined>(undefined);
  const previewRevisionRef = useRef(0);
  const [showSavedResourceRequest, setShowSavedResourceRequest] =
    useState(true);
  const [isComputingRequest, setIsComputingRequest] = useState(false);
  const [value, setValue] = useState<unknown>(() => {
    if (variable?.type === "variable") {
      if (variable.value.type === "json") {
        return formatValue(variable.value.value);
      }
      return variable.value.value;
    }
  });

  const resources = useStore($resources);
  const [variableType, setVariableType] = useState<VariableType>(() => {
    if (variable?.type === "resource") {
      const resource = resources.get(variable.resourceId);
      if (resource?.control === "system") {
        if (resource.url === JSON.stringify(currentDateResourceUrl)) {
          return "current-date-resource";
        }
        if (hasAssetsResourceUrl(resource)) {
          return "assets-resource";
        }
        return "sitemap-resource";
      }
      if (resource?.control === "graphql") {
        return "graphql-resource";
      }
      if (resource?.control === "email") {
        return "email-resource";
      }
      return "resource";
    }
    if (variable?.type === "parameter") {
      return variable.type;
    }
    if (variable?.type === "variable") {
      const type = variable.value.type;
      if (type === "string" || type === "number" || type === "boolean") {
        return type;
      }
      return "json";
    }
    return "string";
  });

  const cancelPreview = () => {
    previewRevisionRef.current += 1;
    previewReleaseRef.current?.();
    previewReleaseRef.current = undefined;
    setIsComputingRequest(false);
  };

  const onResourceChange = () => {
    cancelPreview();
    setShowSavedResourceRequest(false);
    setValue(undefined);
  };

  useEffect(() => {
    if (isOpen) {
      return () => {
        previewRevisionRef.current += 1;
        previewReleaseRef.current?.();
        previewReleaseRef.current = undefined;
      };
    }
  }, [isOpen]);

  const updateVariableType = (variableType: VariableType) => {
    cancelPreview();
    setShowSavedResourceRequest(false);
    setVariableType(variableType);
    setValue((prev: unknown) => {
      if (
        variableType === "resource" ||
        variableType === "email-resource" ||
        variableType === "graphql-resource" ||
        variableType === "sitemap-resource" ||
        variableType === "current-date-resource" ||
        variableType === "assets-resource"
      ) {
        return;
      }
      if (variableType === "string" && typeof prev !== "string") {
        return "";
      }
      if (variableType === "number" && typeof prev !== "number") {
        return "";
      }
      if (variableType === "boolean" && typeof prev !== "boolean") {
        return false;
      }
      if (variableType === "json") {
        // empty string gives an error
        return prev || "{}";
      }
      return prev;
    });
  };

  const resourceScope = useResourceScope({ variable });

  const reloadData = async () => {
    cancelPreview();
    const revision = previewRevisionRef.current;
    setShowSavedResourceRequest(false);
    setValue(undefined);
    const formData = getReloadableResourceFormData(formRef.current);
    if (formData === undefined) {
      return;
    }
    setIsComputingRequest(true);
    try {
      const resource = createResourceValueFromFormData({
        id: variable?.id ?? "new",
        formData,
      });
      const resourceRequest = await computeResourceRequest(
        resource,
        resourceScope.variableValues
      );
      if (revision !== previewRevisionRef.current) {
        return;
      }
      previewReleaseRef.current = loadResourcePreview(resourceRequest);
      setValue(resourceRequest);
    } catch {
      if (revision === previewRevisionRef.current) {
        console.error("Unable to load resource preview");
      }
    } finally {
      if (revision === previewRevisionRef.current) {
        setIsComputingRequest(false);
      }
    }
  };

  return (
    <>
      <SplitView
        defaultSize={{ value: 320, unit: "px" }}
        minimumStartSize={240}
        minimumEndSize={240}
        separatorLabel="Resize variable configuration"
        start={
          <ScrollArea
            // flex fixes content overflowing artificial scroll area
            css={{ display: "flex", flexDirection: "column" }}
          >
            <form
              ref={formRef}
              noValidate={true}
              // exclude from the flow
              style={{ display: "contents" }}
              onSubmit={(event) => {
                event.preventDefault();
                if (isSystemVariable) {
                  return;
                }
                const nameElement =
                  event.currentTarget.elements.namedItem("name");
                // make sure only name is valid and allow to save everything else
                // to avoid loosing complex configuration when closed accidentally
                if (
                  nameElement instanceof HTMLInputElement &&
                  nameElement.checkValidity()
                ) {
                  const formData = new FormData(event.currentTarget);
                  const saved = panelRef.current?.save(formData);
                  // close popover whenever new variable is created
                  // to prevent creating duplicated variable
                  if (variable === undefined && saved !== false) {
                    onClose();
                  }
                }
              }}
            >
              {/* submit is not triggered when press enter on input without submit button */}
              <button hidden></button>
              <fieldset
                style={{ display: "contents" }}
                // forbid editing system variable
                disabled={isSystemVariable}
              >
                <VariablePanelForm
                  ref={panelRef}
                  variable={variable}
                  variableType={variableType}
                  onVariableTypeChange={updateVariableType}
                  value={value}
                  onValueChange={setValue}
                  onResourceChange={onResourceChange}
                  querySourceContainer={querySourceContainer}
                  onQueryActiveChange={setQueryActive}
                  onQueryPendingChange={setQueryPending}
                />
              </fieldset>
            </form>
          </ScrollArea>
        }
        end={
          <VariablePreview
            variable={variable}
            variableType={variableType}
            variableValue={value}
            showSavedResourceRequest={showSavedResourceRequest}
            isComputingRequest={isComputingRequest}
            onLoadData={reloadData}
            queryActive={queryActive}
            queryPending={queryPending}
            queryContainerRef={queryContainerRef}
          />
        }
      />

      <DialogTitle
        maximizable
        suffix={
          <DialogTitleActions>
            {variable && (
              <VariableMenu
                variable={variable}
                size="header"
                includePaste={false}
                canDelete={!isSystemVariable && canDeleteVariable(variable)}
                onDelete={onClose}
                onRefresh={
                  variableType === "resource" ||
                  variableType === "graphql-resource" ||
                  variableType === "sitemap-resource" ||
                  variableType === "current-date-resource" ||
                  variableType === "assets-resource"
                    ? () => void reloadData()
                    : undefined
                }
              />
            )}
            {(variableType === "resource" ||
              variableType === "graphql-resource" ||
              variableType === "sitemap-resource" ||
              variableType === "current-date-resource" ||
              variableType === "assets-resource") && (
              <Tooltip content="Refresh resource data" side="bottom">
                <Button
                  type="button"
                  aria-label="Refresh resource data"
                  prefix={<RefreshIcon />}
                  color="ghost"
                  disabled={isComputingRequest}
                  onClick={reloadData}
                />
              </Tooltip>
            )}
            <DialogMaximize />
            <DialogClose />
          </DialogTitleActions>
        }
      >
        {variable ? "Edit variable" : "New variable"}
      </DialogTitle>
    </>
  );
};

const areAllFormErrorsVisible = (form: null | HTMLFormElement) => {
  if (form === null) {
    return true;
  }
  // check all errors in form fields are visible
  for (const element of form.elements) {
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
  return true;
};

export const VariablePopoverTrigger = ({
  variable,
  children,
  onOpenChange,
}: {
  variable?: DataSource;
  children: ReactNode;
  onOpenChange?: (isOpen: boolean) => void;
}) => {
  const [isOpen, setOpen] = useState(false);
  const variableToOpen = useStore($variableToOpen);
  const formRef = useRef<HTMLFormElement>(null);
  const variableId = variable?.id;

  useEffect(() => {
    if (variableId === undefined || variableToOpen?.id !== variableId) {
      return;
    }
    setOpen(true);
    onOpenChange?.(true);
    $variableToOpen.set(undefined);
  }, [onOpenChange, variableId, variableToOpen]);

  return (
    <FloatingPanel
      maximizable
      resize="both"
      placement="center"
      width={740}
      height={480}
      open={isOpen}
      onOpenChange={(newOpen) => {
        if (newOpen) {
          setOpen(true);
          onOpenChange?.(true);
          return;
        }
        // attempt to save form on close
        if (areAllFormErrorsVisible(formRef.current)) {
          formRef.current?.requestSubmit();
          setOpen(false);
          onOpenChange?.(false);
        } else {
          formRef.current?.checkValidity();
          // prevent closing when not all errors are shown to user
        }
      }}
      title={undefined}
      content={
        <div
          data-variable-editor-dialog
          style={{ display: "contents" }}
          onPointerDown={(event) => {
            if (event.button === 2) {
              event.stopPropagation();
            }
          }}
          onContextMenu={(event) => event.stopPropagation()}
        >
          <VariablePopoverContent
            formRef={formRef}
            variable={variable}
            isOpen={isOpen}
            onClose={() => {
              setOpen(false);
              onOpenChange?.(false);
            }}
          />
        </div>
      }
    >
      {children}
    </FloatingPanel>
  );
};

VariablePopoverTrigger.displayName = "VariablePopoverTrigger";

const getReloadableResourceFormData = (form: HTMLFormElement | null) => {
  const formData = new FormData(form ?? undefined);
  if (formData.get("asset-query-valid") === "false") {
    return;
  }
  return formData;
};

export const __testing__ = {
  VariablePreview,
  NameField,
  JsonForm,
  getReloadableResourceFormData,
  TypeField,
};
