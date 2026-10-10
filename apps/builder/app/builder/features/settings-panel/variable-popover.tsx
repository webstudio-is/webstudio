import { useStore } from "@nanostores/react";
import {
  type ReactNode,
  type RefObject,
  forwardRef,
  useId,
  useState,
  useRef,
  useEffect,
  useCallback,
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
  Label,
  ProChip,
  ScrollArea,
  Select,
  SplitView,
  Tooltip,
  theme,
} from "@webstudio-is/design-system";
import {
  type DataSource,
  SYSTEM_VARIABLE_ID,
  hasAssetsResourceUrl,
} from "@webstudio-is/sdk";
import {
  browserInfoParameterName,
  formDataParameterName,
  currentDateResourceUrl,
} from "@webstudio-is/sdk/runtime";
import { formatValue } from "~/builder/shared/expression-editor";
import { $permissions } from "~/shared/nano-states";
import { $dataSources } from "~/shared/sync/data-stores";
import { $resources, $instances, $props } from "~/shared/sync/data-stores";
import { $selectedInstance } from "~/shared/nano-states";
import { $variableToOpen } from "./variable-navigation";
import {
  findAvailableVariables,
  createResourceValueFromFormData,
  findUnsetVariableNames,
} from "@webstudio-is/project-build/runtime";
import { validateDataVariableName } from "~/builder/shared/data-variable-utils";
import { SystemResourceForm } from "./resource-panel";
import { ResourceForm } from "./http-resource-panel";
import { useResourceScope } from "./resource-scope";
import { EmailResourceForm } from "./email-resource-panel";
import { GraphqlResourceForm } from "./graphql-resource-panel";
import {
  computeResourceRequest,
  loadResourcePreview,
} from "~/shared/resources";
import { Row } from "./shared";
import {
  buildEmailRequestPreview,
  buildEmailRequestPreviewFromEditor,
} from "./email-request-preview";
import { canDeleteVariable, VariableMenu } from "./variable-menu";
import {
  AssetsResourceForm,
  getReloadableAssetsResourceFormData,
  useAssetsQueryBridge,
} from "./assets-resource-panel";
import type { PanelApi } from "./variable-panel-api";
import {
  ParameterForm,
  ParameterVariablePreview,
} from "./variable-parameter-panel";
import { StringForm } from "./variable-string-panel";
import { NumberForm, NumberVariablePreview } from "./variable-number-panel";
import { BooleanForm } from "./variable-boolean-panel";
import { JsonForm, JsonVariablePreview } from "./variable-json-panel";
import { ResourceVariablePreview } from "./resource-variable-preview";
import { ValuePreviewFrame } from "./variable-value-preview";
import type { VariablePreviewProps, VariableType } from "./variable-types";

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
          {variableType === "email-resource" && (
            <EmailResourceForm
              ref={ref}
              variable={variable}
              onChange={onResourceChange}
            />
          )}
          {(variableType === "sitemap-resource" ||
            variableType === "current-date-resource") && (
            <SystemResourceForm
              ref={ref}
              resourceType={variableType}
              variable={variable}
            />
          )}
          {variableType === "assets-resource" && (
            <AssetsResourceForm
              ref={ref}
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

const VariablePreview = (props: VariablePreviewProps) => {
  const { variableType, variableValue } = props;
  if (variableType === "string") {
    return <ValuePreviewFrame value={variableValue} />;
  }
  if (variableType === "number") {
    return <NumberVariablePreview value={variableValue} />;
  }
  if (variableType === "boolean") {
    return <ValuePreviewFrame value={variableValue} />;
  }
  if (variableType === "json") {
    return <JsonVariablePreview value={variableValue} />;
  }
  if (variableType === "parameter") {
    return <ParameterVariablePreview variable={props.variable} />;
  }
  return <ResourceVariablePreview {...props} />;
};

const VariablePopoverContent = ({
  formRef,
  variable,
  isOpen,
  onClose,
  onSave,
}: {
  formRef: RefObject<HTMLFormElement>;
  variable?: DataSource;
  isOpen: boolean;
  onClose: () => void;
  onSave: (saved: boolean) => void;
}) => {
  const panelRef = useRef<undefined | PanelApi>(undefined);
  const assetsQuery = useAssetsQueryBridge();
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
  const [emailRequestPreview, setEmailRequestPreview] = useState<
    Awaited<ReturnType<typeof buildEmailRequestPreview>> | undefined
  >();
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
    setEmailRequestPreview(undefined);
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
    setEmailRequestPreview(undefined);
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

  const loadEmailRequestPreview = async () => {
    cancelPreview();
    const revision = previewRevisionRef.current;
    setEmailRequestPreview(undefined);
    if (formRef.current === null) {
      return;
    }
    setIsComputingRequest(true);
    try {
      const preview = await buildEmailRequestPreviewFromEditor({
        form: formRef.current,
        variable,
        scope: resourceScope.scope,
        aliases: resourceScope.aliases,
      });
      if (revision === previewRevisionRef.current) {
        setEmailRequestPreview(preview);
      }
    } catch {
      if (revision === previewRevisionRef.current) {
        console.error("Unable to build Email request preview");
      }
    } finally {
      if (revision === previewRevisionRef.current) {
        setIsComputingRequest(false);
      }
    }
  };

  const reloadData = async () => {
    cancelPreview();
    const revision = previewRevisionRef.current;
    setShowSavedResourceRequest(false);
    setValue(undefined);
    const formData =
      variableType === "assets-resource"
        ? getReloadableAssetsResourceFormData(formRef.current)
        : new FormData(formRef.current ?? undefined);
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
                  onSave(saved !== false);
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
                  querySourceContainer={assetsQuery.sourceContainer}
                  onQueryActiveChange={assetsQuery.onActiveChange}
                  onQueryPendingChange={assetsQuery.onPendingChange}
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
            onLoadEmailRequest={loadEmailRequestPreview}
            emailRequestPreview={emailRequestPreview}
            queryActive={assetsQuery.active}
            queryPending={assetsQuery.pending}
            queryContainerRef={assetsQuery.containerRef}
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
  const saveFailedRef = useRef(false);
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
          saveFailedRef.current = false;
          formRef.current?.requestSubmit();
          if (saveFailedRef.current) {
            return;
          }
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
            onSave={(saved) => {
              saveFailedRef.current = !saved;
            }}
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

export const __testing__ = {
  VariablePreview,
  NameField,
  JsonForm,
  TypeField,
};
