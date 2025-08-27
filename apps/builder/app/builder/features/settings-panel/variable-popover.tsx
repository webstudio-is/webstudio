import { z } from "zod";
import { nanoid } from "nanoid";
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
  createContext,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { CopyIcon, RefreshIcon, UpgradeIcon } from "@webstudio-is/icons";
import {
  Box,
  Button,
  Combobox,
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
  Link,
  PanelBanner,
  ProBadge,
  ScrollArea,
  Select,
  Switch,
  Text,
  TextArea,
  Tooltip,
  theme,
} from "@webstudio-is/design-system";
import {
  type DataSource,
  transpileExpression,
  lintExpression,
  SYSTEM_VARIABLE_ID,
} from "@webstudio-is/sdk";
import {
  ExpressionEditor,
  formatValue,
} from "~/builder/shared/expression-editor";
import {
  $dataSources,
  $resources,
  $areResourcesLoading,
  invalidateResource,
  getComputedResourceRequest,
  $userPlanFeatures,
  $instances,
  $props,
  $variableValuesByInstanceSelector,
} from "~/shared/nano-states";
import {
  $selectedInstance,
  $selectedInstanceKeyWithRoot,
} from "~/shared/awareness";
import { BindingPopoverProvider } from "~/builder/shared/binding-popover";
import {
  EditorContent,
  EditorDialog,
  EditorDialogButton,
  EditorDialogControl,
  foldGutterExtension,
} from "~/builder/shared/code-editor-base";
import { updateWebstudioData } from "~/shared/instance-utils";
import {
  findUnsetVariableNames,
  rebindTreeVariablesMutable,
} from "~/shared/data-variables";
import {
  GraphqlResourceForm,
  ResourceForm,
  SystemResourceForm,
} from "./resource-panel";
import { generateCurl } from "./curl";

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
  const validateName = useCallback(
    (value: string) => {
      // validate same name on variable instance
      // and fallback to selected instance for new variables
      const scopeInstanceId =
        variable?.scopeInstanceId ?? $selectedInstance.get();
      for (const dataSource of $dataSources.get().values()) {
        if (
          dataSource.scopeInstanceId === scopeInstanceId &&
          dataSource.name === value &&
          dataSource.id !== variable?.id
        ) {
          return "Name is already used by another variable on this instance";
        }
      }
      if (value.trim().length === 0) {
        return "Name is required";
      }
      return "";
    },
    [variable]
  );
  const [value, setValue] = useState(defaultValue);
  useEffect(() => {
    ref.current?.setCustomValidity(validateName(value));
  }, [value, validateName]);
  return (
    <Grid gap={1}>
      <Label htmlFor={nameId}>Name</Label>
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
  | "graphql-resource"
  | "system-resource";

const TypeField = ({
  value,
  onChange,
}: {
  value: VariableType;
  onChange: (value: VariableType) => void;
}) => {
  const { allowDynamicData } = useStore($userPlanFeatures);
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
      label: (
        <Flex direction="row" gap="2" align="center">
          Resource
          {allowDynamicData === false && <ProBadge>Pro</ProBadge>}
        </Flex>
      ),
      description:
        "A Resource is a configuration for secure data fetching. You can safely use secrets in any field.",
    },
    {
      value: "graphql-resource",
      label: (
        <Flex direction="row" gap="2" align="center">
          GraphQL
          {allowDynamicData === false && <ProBadge>Pro</ProBadge>}
        </Flex>
      ),
      description:
        "A Resource is a configuration for secure data fetching. You can safely use secrets in any field.",
    },
    {
      value: "system-resource",
      label: (
        <Flex direction="row" gap="2" align="center">
          System Resource
          {allowDynamicData === false && <ProBadge>Pro</ProBadge>}
        </Flex>
      ),
      description: "A System Resource is a configuration for Webstudio data.",
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
        getDescription={(option) => (
          <Box css={{ width: theme.spacing[27] }}>
            {options.get(option)?.description}
          </Box>
        )}
        value={value}
        name="type"
        onChange={onChange}
      />
    </Grid>
  );
};

type PanelApi = {
  save: (formData: FormData) => void;
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
      updateWebstudioData((data) => {
        data.dataSources.set(variable.id, { ...variable, name });
        rebindTreeVariablesMutable({
          startingInstanceId: scopeInstanceId,
          ...data,
        });
      });
    },
  }));
  return <></>;
});
ParameterForm.displayName = "ParameterForm";

const useValuePanelRef = ({
  ref,
  variable,
  variableValue,
}: {
  ref: Ref<undefined | PanelApi>;
  variable?: DataSource;
  variableValue: Extract<DataSource, { type: "variable" }>["value"];
}) => {
  useImperativeHandle(ref, () => ({
    save: (formData) => {
      const dataSourceId = variable?.id ?? nanoid();
      // preserve existing instance scope when edit
      const scopeInstanceId =
        variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
      if (scopeInstanceId === undefined) {
        return;
      }
      const name = z.string().parse(formData.get("name"));
      updateWebstudioData((data) => {
        // cleanup resource when value variable is set
        if (variable?.type === "resource") {
          data.resources.delete(variable.resourceId);
        }
        data.dataSources.set(dataSourceId, {
          id: dataSourceId,
          scopeInstanceId,
          name,
          type: "variable",
          value: variableValue,
        });
        rebindTreeVariablesMutable({
          startingInstanceId: scopeInstanceId,
          ...data,
        });
      });
    },
  }));
};

const StringForm = forwardRef<
  undefined | PanelApi,
  {
    variable?: DataSource;
  }
>(({ variable }, ref) => {
  const [value, setValue] = useState(
    variable?.type === "variable" && variable.value.type === "string"
      ? variable.value.value
      : ""
  );
  useValuePanelRef({
    ref,
    variable,
    variableValue: { type: "string", value },
  });
  const valueId = useId();
  return (
    <>
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
            onChange={setValue}
          />
          <EditorDialog
            title="Variable value"
            content={
              <TextArea
                grow={true}
                id={valueId}
                value={value}
                onChange={setValue}
              />
            }
          >
            <EditorDialogButton />
          </EditorDialog>
        </EditorDialogControl>
      </Flex>
    </>
  );
});
StringForm.displayName = "StringForm";

const validateNumberValue = (value: string | number) => {
  if (typeof value === "string" && value.length === 0) {
    return "Value expects a number";
  }
  const number = Number(value);
  return Number.isNaN(number) ? "Invalid number" : "";
};

const NumberForm = forwardRef<
  undefined | PanelApi,
  {
    variable?: DataSource;
  }
>(({ variable }, ref) => {
  const [value, setValue] = useState(
    variable?.type === "variable" && variable.value.type === "number"
      ? variable.value.value
      : ""
  );
  const [valueError, setValueError] = useState("");
  const valueRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    valueRef.current?.setCustomValidity(validateNumberValue(value));
    setValueError("");
  }, [value]);
  useValuePanelRef({
    ref,
    variable,
    variableValue: { type: "number", value: Number(value) },
  });
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
            onChange={(event) => setValue(event.target.value)}
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
  }
>(({ variable }, ref) => {
  const [value, setValue] = useState(
    variable?.type === "variable" && variable.value.type === "boolean"
      ? variable.value.value
      : false
  );
  useValuePanelRef({
    ref,
    variable,
    variableValue: { type: "boolean", value },
  });
  const valueId = useId();
  return (
    <>
      <Flex direction="column" css={{ gap: theme.spacing[3] }}>
        <Label htmlFor={valueId}>Value</Label>
        <Switch
          name="value"
          id={valueId}
          checked={value}
          onCheckedChange={setValue}
        />
      </Flex>
    </>
  );
});
BooleanForm.displayName = "BooleanForm";

const validateJsonValue = (expression: string) => {
  const diagnostics = lintExpression({ expression });
  // prevent saving with any message including unset variable
  return diagnostics.length > 0 ? "error" : "";
};

const parseJsonValue = (expression: string) => {
  try {
    expression = transpileExpression({ expression, executable: true });
    // wrap with parentheses to treat {} as object instead of block
    return eval(`(${expression})`);
  } catch {
    // empty block
  }
};

const JsonForm = forwardRef<
  undefined | PanelApi,
  {
    variable?: DataSource;
  }
>(({ variable }, ref) => {
  const [value, setValue] = useState<string>(
    variable?.type === "variable" &&
      (variable.value.type === "json" || variable.value.type === "string[]")
      ? formatValue(variable.value.value)
      : ``
  );
  const [valueError, setValueError] = useState("");
  const valueRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    valueRef.current?.setCustomValidity(validateJsonValue(value));
    setValueError("");
  }, [value]);
  useValuePanelRef({
    ref,
    variable,
    variableValue: {
      type: "json",
      value: parseJsonValue(value),
    },
  });
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
          color={valueError ? "error" : undefined}
          value={value}
          onChange={setValue}
          onChangeComplete={() => valueRef.current?.checkValidity()}
        />
      </Flex>
    </>
  );
});
JsonForm.displayName = "JsonForm";

const VariablePanel = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource }
>(({ variable }, ref) => {
  const resources = useStore($resources);
  const { allowDynamicData } = useStore($userPlanFeatures);

  const [variableType, setVariableType] = useState<VariableType>(() => {
    if (variable?.type === "resource") {
      const resource = resources.get(variable.resourceId);
      if (resource?.control === "system") {
        return "system-resource";
      }
      if (resource?.control === "graphql") {
        return "graphql-resource";
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

  let fields: ReactNode;
  if (variableType === "parameter") {
    fields = <ParameterForm ref={ref} variable={variable} />;
  }
  if (variableType === "string") {
    fields = (
      <>
        <TypeField value={variableType} onChange={setVariableType} />
        <StringForm ref={ref} variable={variable} />
      </>
    );
  }
  if (variableType === "number") {
    fields = (
      <>
        <TypeField value={variableType} onChange={setVariableType} />
        <NumberForm ref={ref} variable={variable} />
      </>
    );
  }
  if (variableType === "boolean") {
    fields = (
      <>
        <TypeField value={variableType} onChange={setVariableType} />
        <BooleanForm ref={ref} variable={variable} />
      </>
    );
  }
  if (variableType === "json") {
    fields = (
      <>
        <TypeField value={variableType} onChange={setVariableType} />
        <JsonForm ref={ref} variable={variable} />
      </>
    );
  }

  if (variableType === "resource") {
    fields = (
      <>
        <TypeField value={variableType} onChange={setVariableType} />
        <ResourceForm ref={ref} variable={variable} />
      </>
    );
  }
  if (variableType === "graphql-resource") {
    fields = (
      <>
        <TypeField value={variableType} onChange={setVariableType} />
        <GraphqlResourceForm ref={ref} variable={variable} />
      </>
    );
  }
  if (variableType === "system-resource") {
    fields = (
      <>
        <TypeField value={variableType} onChange={setVariableType} />
        <SystemResourceForm ref={ref} variable={variable} />
      </>
    );
  }

  const isResource =
    variableType === "resource" ||
    variableType === "graphql-resource" ||
    variableType === "system-resource";
  const requiresUpgrade = allowDynamicData === false && isResource;
  return (
    <>
      {requiresUpgrade && (
        <PanelBanner>
          <Text>Resource fetching is part of the CMS functionality.</Text>
          <Flex align="center" gap={1}>
            <UpgradeIcon />
            <Link
              color="inherit"
              target="_blank"
              href="https://webstudio.is/pricing"
            >
              Upgrade to Pro
            </Link>
          </Flex>
        </PanelBanner>
      )}
      <Flex
        direction="column"
        css={{
          overflow: "hidden",
          padding: theme.panel.padding,
          gap: theme.spacing[7],
        }}
      >
        <NameField variable={variable} defaultValue={variable?.name ?? ""} />
        {fields}
      </Flex>
    </>
  );
});
VariablePanel.displayName = "VariableForm";

const VariablePopoverContext = createContext<{
  containerRef?: RefObject<null | HTMLElement>;
}>({});

export const VariablePopoverProvider = VariablePopoverContext.Provider;

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

const $instanceVariableValues = computed(
  [$selectedInstanceKeyWithRoot, $variableValuesByInstanceSelector],
  (instanceKey, variableValuesByInstanceSelector) =>
    variableValuesByInstanceSelector.get(instanceKey ?? "") ??
    new Map<string, unknown>()
);

const VariablePreview = ({ variable }: { variable: DataSource }) => {
  const variableValues = useStore($instanceVariableValues);
  const extensions = useMemo(() => [javascript({}), foldGutterExtension], []);
  const editorProps = {
    readOnly: true,
    extensions,
    // compute value as json lazily only when dialog is open
    // by spliting into separate component which is invoked
    // only when dialog content is rendered
    value: JSON.stringify(variableValues.get(variable.id), null, 2),
    onChange: () => {},
    onChangeComplete: () => {},
  };
  return (
    <Grid
      align="stretch"
      css={{
        height: "100%",
        overflow: "hidden",
        boxSizing: "content-box",
      }}
    >
      <EditorContent {...editorProps} />
    </Grid>
  );
};

export const VariablePopoverTrigger = ({
  variable,
  children,
}: {
  variable?: DataSource;
  children: ReactNode;
}) => {
  const areResourcesLoading = useStore($areResourcesLoading);
  const [isOpen, setOpen] = useState(false);
  const bindingPopoverContainerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<undefined | PanelApi>(undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const resources = useStore($resources);
  const isSystemVariable = variable?.id === SYSTEM_VARIABLE_ID;

  return (
    <FloatingPanel
      placement="center"
      width={variable ? 740 : 320}
      height={480}
      open={isOpen}
      onOpenChange={(newOpen) => {
        if (newOpen) {
          setOpen(true);
          return;
        }
        // attempt to save form on close
        if (areAllFormErrorsVisible(formRef.current)) {
          formRef.current?.requestSubmit();
          setOpen(false);
        } else {
          formRef.current?.checkValidity();
          // prevent closing when not all errors are shown to user
        }
      }}
      title={
        variable === undefined ? (
          <DialogTitle>New Variable</DialogTitle>
        ) : (
          <DialogTitle
            suffix={
              <DialogTitleActions>
                {variable?.type === "resource" && (
                  <>
                    {/* allow to copy curl only for default and graphql resource controls */}
                    {resources.get(variable.resourceId)?.control !==
                      "system" && (
                      <Tooltip
                        content="Copy resource as cURL command"
                        side="bottom"
                      >
                        <Button
                          aria-label="Copy resource as cURL command"
                          prefix={<CopyIcon />}
                          color="ghost"
                          onClick={() => {
                            const resourceRequest = getComputedResourceRequest(
                              variable.resourceId
                            );
                            if (resourceRequest) {
                              navigator.clipboard.writeText(
                                generateCurl(resourceRequest)
                              );
                            }
                          }}
                        />
                      </Tooltip>
                    )}
                    <Tooltip content="Refresh resource data" side="bottom">
                      <Button
                        aria-label="Refresh resource data"
                        prefix={<RefreshIcon />}
                        color="ghost"
                        disabled={areResourcesLoading}
                        onClick={() => {
                          formRef.current?.requestSubmit();
                          if (formRef.current?.checkValidity()) {
                            invalidateResource(variable.resourceId);
                          }
                        }}
                      />
                    </Tooltip>
                  </>
                )}
                <DialogMaximize />
                <DialogClose />
              </DialogTitleActions>
            }
          >
            Edit Variable
          </DialogTitle>
        )
      }
      content={
        <Grid
          css={{
            height: "100%",
            gridTemplateColumns: "320px 1fr",
          }}
        >
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
                  panelRef.current?.save(formData);
                  // close popover whenever new variable is created
                  // to prevent creating duplicated variable
                  if (variable === undefined) {
                    setOpen(false);
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
                <BindingPopoverProvider
                  value={{ containerRef: bindingPopoverContainerRef }}
                >
                  <VariablePanel ref={panelRef} variable={variable} />
                </BindingPopoverProvider>
              </fieldset>
            </form>
          </ScrollArea>
          {variable && <VariablePreview variable={variable} />}
        </Grid>
      }
    >
      {children}
    </FloatingPanel>
  );
};

VariablePopoverTrigger.displayName = "VariablePopoverTrigger";
