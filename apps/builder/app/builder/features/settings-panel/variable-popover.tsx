import { z } from "zod";
import { nanoid } from "nanoid";
import { useStore } from "@nanostores/react";
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
  useContext,
  useEffect,
} from "react";
import { mergeRefs } from "@react-aria/utils";
import { CopyIcon, RefreshIcon } from "@webstudio-is/icons";
import {
  Box,
  Button,
  Flex,
  FloatingPanelPopover,
  FloatingPanelPopoverContent,
  FloatingPanelPopoverTitle,
  FloatingPanelPopoverTrigger,
  Grid,
  InputErrorsTooltip,
  InputField,
  Label,
  ProBadge,
  ScrollArea,
  Select,
  Switch,
  TextArea,
  Tooltip,
  theme,
} from "@webstudio-is/design-system";
import { type DataSource, transpileExpression } from "@webstudio-is/sdk";
import {
  ExpressionEditor,
  formatValue,
} from "~/builder/shared/expression-editor";
import {
  $dataSources,
  $resources,
  $areResourcesLoading,
  $selectedInstanceSelector,
  invalidateResource,
  getComputedResource,
} from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync";
import {
  useField,
  composeFields,
  type ComposedFields,
} from "~/shared/form-utils";
import { $userPlanFeatures } from "~/builder/shared/nano-states";
import { BindingPopoverProvider } from "~/builder/shared/binding-popover";
import { useSideOffset } from "~/builder/shared/floating-panel";
import {
  EditorDialog,
  EditorDialogButton,
  EditorDialogControl,
} from "~/builder/shared/code-editor-base";
import {
  GraphqlResourceForm,
  ResourceForm,
  SystemResourceForm,
  composeWithNativeForm,
} from "./resource-panel";
import { generateCurl } from "./curl";

const validateName = (value: string) =>
  value.trim().length === 0 ? "Name is required" : "";

const NameField = ({ defaultValue }: { defaultValue: string }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const nameId = useId();
  useEffect(() => {
    ref.current?.setCustomValidity(validateName(defaultValue));
  }, [defaultValue]);
  return (
    <Grid gap={1}>
      <Label htmlFor={nameId}>Name</Label>
      <InputErrorsTooltip errors={error ? [error] : undefined}>
        <InputField
          inputRef={ref}
          name="name"
          id={nameId}
          color={error ? "error" : undefined}
          defaultValue={defaultValue}
          onChange={(event) => {
            event.target.setCustomValidity(validateName(event.target.value));
            setError("");
          }}
          onBlur={() => ref.current?.checkValidity()}
          onInvalid={(event) => setError(event.currentTarget.validationMessage)}
        />
      </InputErrorsTooltip>
    </Grid>
  );
};

/**
 * convert value expression to js value
 * validating out accessing any identifier
 */
const parseJsonValue = (code: string) => {
  const result: { value?: unknown; error?: string } = {};
  const ids = new Set<string>();
  if (code.trim().length === 0) {
    result.error = "Value is required";
    return result;
  }
  try {
    code = transpileExpression({
      expression: code,
      executable: true,
      replaceVariable: (id) => {
        ids.add(id);
      },
    });
  } catch (error) {
    result.error = (error as Error).message;
    return result;
  }
  if (ids.size === 0) {
    try {
      // wrap with parentheses to treat {} as object instead of block
      result.value = eval(`(${code})`);
    } catch (error) {
      result.error = `Parse Error: ${(error as Error).message}`;
    }
  } else {
    const idsList = Array.from(ids).join(", ");
    result.error = `Cannot use variables ${idsList} as variable value`;
  }
  return result;
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
      disabled: allowDynamicData === false,
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
      disabled: allowDynamicData === false,
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
      disabled: allowDynamicData === false,
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
        onChange={onChange}
      />
    </Grid>
  );
};

type PanelApi = ComposedFields & {
  save: () => void;
};

const ParameterForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource }
>(({ variable }, ref) => {
  const formAccessorRef = useRef<HTMLInputElement>(null);
  const form = composeWithNativeForm(formAccessorRef, composeFields());
  useImperativeHandle(ref, () => ({
    ...form,
    save: () => {
      // only existing parameter variables can be renamed
      if (variable === undefined) {
        return;
      }
      const formData = new FormData(formAccessorRef.current?.form ?? undefined);
      const name = z.string().parse(formData.get("name"));
      serverSyncStore.createTransaction([$dataSources], (dataSources) => {
        dataSources.set(variable.id, { ...variable, name });
      });
    },
  }));
  return (
    <>
      <input ref={formAccessorRef} type="hidden" name="form-accessor" />
    </>
  );
});
ParameterForm.displayName = "ParameterForm";

const useValuePanelRef = ({
  ref,
  variable,
  form,
  formAccessorRef,
  variableValue,
}: {
  ref: Ref<undefined | PanelApi>;
  variable?: DataSource;
  form: ComposedFields;
  formAccessorRef: RefObject<HTMLInputElement>;
  variableValue: Extract<DataSource, { type: "variable" }>["value"];
}) => {
  useImperativeHandle(ref, () => ({
    ...form,
    save: () => {
      const instanceSelector = $selectedInstanceSelector.get();
      if (instanceSelector === undefined) {
        return;
      }
      const [instanceId] = instanceSelector;
      const dataSourceId = variable?.id ?? nanoid();
      // preserve existing instance scope when edit
      const scopeInstanceId = variable?.scopeInstanceId ?? instanceId;
      const formData = new FormData(formAccessorRef.current?.form ?? undefined);
      const name = z.string().parse(formData.get("name"));
      serverSyncStore.createTransaction(
        [$dataSources, $resources],
        (dataSources, resources) => {
          // cleanup resource when value variable is set
          if (variable?.type === "resource") {
            resources.delete(variable.resourceId);
          }
          dataSources.set(dataSourceId, {
            id: dataSourceId,
            scopeInstanceId,
            name,
            type: "variable",
            value: variableValue,
          });
        }
      );
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
  const formAccessorRef = useRef<HTMLInputElement>(null);
  const form = composeWithNativeForm(formAccessorRef, composeFields());
  useValuePanelRef({
    ref,
    variable,
    form,
    formAccessorRef,
    variableValue: { type: "string", value },
  });
  const valueId = useId();
  return (
    <>
      <input ref={formAccessorRef} type="hidden" name="form-accessor" />
      <Flex direction="column" css={{ gap: theme.spacing[3] }}>
        <Label htmlFor={valueId}>Value</Label>
        <EditorDialogControl>
          <TextArea
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

const NumberForm = forwardRef<
  undefined | PanelApi,
  {
    variable?: DataSource;
  }
>(({ variable }, ref) => {
  const valueField = useField<number | string>({
    initialValue:
      variable?.type === "variable" && variable.value.type === "number"
        ? variable.value.value
        : "",
    validate: (value) => {
      if (typeof value === "string" && value.length === 0) {
        return "Value expects a number";
      }
      const number = Number(value);
      return Number.isNaN(number) ? "Invalid number" : undefined;
    },
  });
  const formAccessorRef = useRef<HTMLInputElement>(null);
  const form = composeWithNativeForm(
    formAccessorRef,
    composeFields(valueField)
  );
  useValuePanelRef({
    ref,
    variable,
    form,
    formAccessorRef,
    variableValue: { type: "number", value: Number(valueField.value) },
  });
  const valueId = useId();
  return (
    <>
      <input ref={formAccessorRef} type="hidden" name="form-accessor" />
      <Flex direction="column" css={{ gap: theme.spacing[3] }}>
        <Label htmlFor={valueId}>Value</Label>
        <InputErrorsTooltip
          errors={valueField.error ? [valueField.error] : undefined}
        >
          <InputField
            id={valueId}
            type="number"
            color={valueField.error ? "error" : undefined}
            value={valueField.value}
            onChange={(event) => {
              valueField.onChange(
                Number.isNaN(event.target.valueAsNumber)
                  ? event.target.value
                  : event.target.valueAsNumber
              );
            }}
            onBlur={valueField.onBlur}
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
  const formAccessorRef = useRef<HTMLInputElement>(null);
  const form = composeWithNativeForm(formAccessorRef, composeFields());
  useValuePanelRef({
    ref,
    variable,
    form,
    formAccessorRef,
    variableValue: { type: "boolean", value },
  });
  const valueId = useId();
  return (
    <>
      <input ref={formAccessorRef} type="hidden" name="form-accessor" />
      <Flex direction="column" css={{ gap: theme.spacing[3] }}>
        <Label htmlFor={valueId}>Value</Label>
        <Switch id={valueId} checked={value} onCheckedChange={setValue} />
      </Flex>
    </>
  );
});
BooleanForm.displayName = "BooleanForm";

const JsonForm = forwardRef<
  undefined | PanelApi,
  {
    variable?: DataSource;
  }
>(({ variable }, ref) => {
  const valueField = useField<string>({
    initialValue:
      variable?.type === "variable" &&
      (variable.value.type === "json" || variable.value.type === "string[]")
        ? formatValue(variable.value.value)
        : ``,
    validate: (value) => parseJsonValue(value).error,
  });
  const formAccessorRef = useRef<HTMLInputElement>(null);
  const form = composeWithNativeForm(
    formAccessorRef,
    composeFields(valueField)
  );
  useValuePanelRef({
    ref,
    variable,
    form,
    formAccessorRef,
    variableValue: {
      type: "json",
      value: parseJsonValue(valueField.value).value,
    },
  });
  return (
    <>
      <input ref={formAccessorRef} type="hidden" name="form-accessor" />
      <Flex direction="column" css={{ gap: theme.spacing[3] }}>
        <Label>Value</Label>
        <InputErrorsTooltip
          errors={valueField.error ? [valueField.error] : undefined}
        >
          {/* use div to position tooltip */}
          <div>
            <ExpressionEditor
              color={valueField.error ? "error" : undefined}
              value={valueField.value}
              onChange={valueField.onChange}
              onBlur={valueField.onBlur}
            />
          </div>
        </InputErrorsTooltip>
      </Flex>
    </>
  );
});
JsonForm.displayName = "JsonForm";

const VariablePanel = forwardRef<
  undefined | PanelApi,
  {
    variable?: DataSource;
  }
>(({ variable }, ref) => {
  const resources = useStore($resources);

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

  if (variableType === "parameter") {
    return (
      <>
        <NameField defaultValue={variable?.name ?? ""} />
        <ParameterForm ref={ref} variable={variable} />
      </>
    );
  }
  if (variableType === "string") {
    return (
      <>
        <NameField defaultValue={variable?.name ?? ""} />
        <TypeField value={variableType} onChange={setVariableType} />
        <StringForm ref={ref} variable={variable} />
      </>
    );
  }
  if (variableType === "number") {
    return (
      <>
        <NameField defaultValue={variable?.name ?? ""} />
        <TypeField value={variableType} onChange={setVariableType} />
        <NumberForm ref={ref} variable={variable} />
      </>
    );
  }
  if (variableType === "boolean") {
    return (
      <>
        <NameField defaultValue={variable?.name ?? ""} />
        <TypeField value={variableType} onChange={setVariableType} />
        <BooleanForm ref={ref} variable={variable} />
      </>
    );
  }
  if (variableType === "json") {
    return (
      <>
        <NameField defaultValue={variable?.name ?? ""} />
        <TypeField value={variableType} onChange={setVariableType} />
        <JsonForm ref={ref} variable={variable} />
      </>
    );
  }

  if (variableType === "resource") {
    return (
      <>
        <NameField defaultValue={variable?.name ?? ""} />
        <TypeField value={variableType} onChange={setVariableType} />
        <ResourceForm ref={ref} variable={variable} />
      </>
    );
  }

  if (variableType === "graphql-resource") {
    return (
      <>
        <NameField defaultValue={variable?.name ?? ""} />
        <TypeField value={variableType} onChange={setVariableType} />
        <GraphqlResourceForm ref={ref} variable={variable} />
      </>
    );
  }

  if (variableType === "system-resource") {
    return (
      <>
        <NameField defaultValue={variable?.name ?? ""} />
        <TypeField value={variableType} onChange={setVariableType} />
        <SystemResourceForm ref={ref} variable={variable} />
      </>
    );
  }

  variableType satisfies never;
});
VariablePanel.displayName = "VariablePanel";

const VariablePopoverContext = createContext<{
  containerRef?: RefObject<HTMLElement>;
}>({});

export const VariablePopoverProvider = VariablePopoverContext.Provider;

export const VariablePopoverTrigger = forwardRef<
  HTMLButtonElement,
  { variable?: DataSource; children: ReactNode }
>(({ variable, children }, ref) => {
  const areResourcesLoading = useStore($areResourcesLoading);
  const [isOpen, setOpen] = useState(false);
  const { containerRef } = useContext(VariablePopoverContext);
  const [triggerRef, sideOffsset] = useSideOffset({ isOpen, containerRef });
  const bindingPopoverContainerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<undefined | PanelApi>();
  const resources = useStore($resources);

  const saveAndClose = () => {
    if (panelRef.current) {
      if (panelRef.current.areAllErrorsVisible() === false) {
        panelRef.current.showAllErrors();
        return;
      }
      if (panelRef.current.isValid()) {
        panelRef.current.save();
      }
    }
    setOpen(false);
  };
  return (
    <FloatingPanelPopover
      modal
      open={isOpen}
      onOpenChange={(newOpen) => {
        if (newOpen === false) {
          saveAndClose();
          return;
        }
        setOpen(newOpen);
      }}
    >
      <FloatingPanelPopoverTrigger ref={mergeRefs(ref, triggerRef)} asChild>
        {children}
      </FloatingPanelPopoverTrigger>
      <FloatingPanelPopoverContent
        ref={bindingPopoverContainerRef}
        sideOffset={sideOffsset}
        side="left"
        align="start"
      >
        <ScrollArea
          css={{
            // flex fixes content overflowing artificial scroll area
            display: "flex",
            flexDirection: "column",
            width: theme.spacing[30],
          }}
        >
          <Flex
            direction="column"
            css={{
              overflow: "hidden",
              gap: theme.spacing[9],
              pt: theme.spacing[5],
              px: theme.spacing[9],
              pb: theme.spacing[9],
            }}
          >
            <form
              // exclude from the flow
              style={{ display: "contents" }}
              onSubmit={(event) => {
                event.preventDefault();
                saveAndClose();
              }}
            >
              {/* submit is not triggered when press enter on input without submit button */}
              <button style={{ display: "none" }}>submit</button>
              <BindingPopoverProvider
                value={{ containerRef: bindingPopoverContainerRef }}
              >
                <VariablePanel ref={panelRef} variable={variable} />
              </BindingPopoverProvider>
            </form>
          </Flex>
        </ScrollArea>
        {/* put after content to avoid auto focusing "Close" button */}
        {variable === undefined ? (
          <FloatingPanelPopoverTitle>New Variable</FloatingPanelPopoverTitle>
        ) : (
          <FloatingPanelPopoverTitle
            actions={
              variable?.type === "resource" && (
                <>
                  {/* allow to copy curl only for default resource control */}
                  {resources.get(variable.resourceId)?.control ===
                    undefined && (
                    <Tooltip
                      content="Copy resource as cURL command"
                      side="bottom"
                    >
                      <Button
                        aria-label="Copy resource as cURL command"
                        prefix={<CopyIcon />}
                        color="ghost"
                        onClick={() => {
                          const resourceRequest = getComputedResource(
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
                        if (panelRef.current) {
                          if (
                            panelRef.current.areAllErrorsVisible() === false
                          ) {
                            panelRef.current.showAllErrors();
                            return;
                          }
                          if (panelRef.current.isValid()) {
                            panelRef.current.save();
                          }
                        }
                        invalidateResource(variable.resourceId);
                      }}
                    />
                  </Tooltip>
                </>
              )
            }
          >
            Edit Variable
          </FloatingPanelPopoverTitle>
        )}
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
});

VariablePopoverTrigger.displayName = "VariablePopoverTrigger";
