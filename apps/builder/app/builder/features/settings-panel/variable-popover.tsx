import { nanoid } from "nanoid";
import { useStore } from "@nanostores/react";
import {
  type ReactNode,
  type Ref,
  type RefObject,
  type ForwardedRef,
  type FocusEvent,
  forwardRef,
  useId,
  useState,
  useImperativeHandle,
  useRef,
  createContext,
  useContext,
  useCallback,
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
import { isLocalResource, transpileExpression } from "@webstudio-is/sdk";
import type { DataSource } from "@webstudio-is/sdk";
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
  type Field,
  composeFields,
  type ComposedFields,
  useFormField,
  Form,
  checkCanRequestSubmit,
} from "~/shared/form-utils";
import { $userPlanFeatures } from "~/builder/shared/nano-states";
import { BindingPopoverProvider } from "~/builder/shared/binding-popover";
import { useSideOffset } from "~/builder/shared/floating-panel";
import {
  EditorDialog,
  EditorDialogButton,
  EditorDialogControl,
} from "~/builder/shared/code-editor-base";
import { ResourceForm, SystemResourceForm } from "./resource-panel";
import { generateCurl } from "./curl";

const NameField = ({
  defaultValue,
  onBlur,
}: {
  defaultValue: string;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
}) => {
  const nameId = useId();
  const { ref, error, props } = useFormField({
    defaultValue,
    validate: useCallback(
      (value: string) => (value.trim().length === 0 ? "Name is required" : ""),
      []
    ),
  });
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
          {...props}
          onBlur={onBlur ?? props.onBlur}
        />
      </InputErrorsTooltip>
    </Grid>
  );
};

const ParameterForm = forwardRef<HTMLFormElement, { variable?: DataSource }>(
  ({ variable }, ref) => {
    return (
      <Form
        ref={ref}
        onSubmit={(event) => {
          const formData = new FormData(event.currentTarget);
          const name = String(formData.get("name"));
          // only existing parameter variables can be renamed
          if (variable === undefined) {
            return;
          }
          serverSyncStore.createTransaction([$dataSources], (dataSources) => {
            dataSources.set(variable.id, { ...variable, name });
          });
        }}
      >
        <NameField
          defaultValue={variable?.name ?? ""}
          onBlur={(event) => event.target.form?.requestSubmit()}
        />
      </Form>
    );
  }
);
ParameterForm.displayName = "ParameterForm";

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
  | "string"
  | "number"
  | "boolean"
  | "json"
  | "resource"
  | "system-resource"
  | "parameter";

type PanelApi = ComposedFields & {
  save: () => void;
};

const useValuePanelRef = ({
  ref,
  variable,
  form,
  name,
  variableValue,
}: {
  ref: Ref<undefined | PanelApi>;
  variable?: DataSource;
  form: ComposedFields;
  name: string;
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
  { variable?: DataSource; nameField: Field<string> }
>(({ variable, nameField }, ref) => {
  const [value, setValue] = useState(
    variable?.type === "variable" && variable.value.type === "string"
      ? variable.value.value
      : ""
  );
  const form = composeFields(nameField);
  useValuePanelRef({
    ref,
    variable,
    form,
    name: nameField.value,
    variableValue: { type: "string", value },
  });
  const valueId = useId();
  return (
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
          title={`Variable "${nameField.value || "Unnamed"}"`}
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
  );
});
StringForm.displayName = "StringForm";

const NumberForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource; nameField: Field<string> }
>(({ variable, nameField }, ref) => {
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
  const form = composeFields(nameField, valueField);
  useValuePanelRef({
    ref,
    variable,
    form,
    name: nameField.value,
    variableValue: { type: "number", value: Number(valueField.value) },
  });
  const valueId = useId();
  return (
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
  );
});
NumberForm.displayName = "NumberForm";

const BooleanForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource; nameField: Field<string> }
>(({ variable, nameField }, ref) => {
  const [value, setValue] = useState(
    variable?.type === "variable" && variable.value.type === "boolean"
      ? variable.value.value
      : false
  );
  const form = composeFields(nameField);
  useValuePanelRef({
    ref,
    variable,
    form,
    name: nameField.value,
    variableValue: { type: "boolean", value },
  });
  const valueId = useId();
  return (
    <Flex direction="column" css={{ gap: theme.spacing[3] }}>
      <Label htmlFor={valueId}>Value</Label>
      <Switch id={valueId} checked={value} onCheckedChange={setValue} />
    </Flex>
  );
});
BooleanForm.displayName = "BooleanForm";

const JsonForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource; nameField: Field<string> }
>(({ variable, nameField }, ref) => {
  const valueField = useField<string>({
    initialValue:
      variable?.type === "variable" &&
      (variable.value.type === "json" || variable.value.type === "string[]")
        ? formatValue(variable.value.value)
        : ``,
    validate: (value) => parseJsonValue(value).error,
  });
  const form = composeFields(nameField, valueField);
  useValuePanelRef({
    ref,
    variable,
    form,
    name: nameField.value,
    variableValue: {
      type: "json",
      value: parseJsonValue(valueField.value).value,
    },
  });
  return (
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
  );
});
JsonForm.displayName = "JsonForm";

const VariablePanel = forwardRef<
  undefined | PanelApi,
  {
    formRef: ForwardedRef<HTMLFormElement>;
    variable?: DataSource;
    onSubmit: () => void;
  }
>(({ formRef, variable, onSubmit }, ref) => {
  const { allowDynamicData } = useStore($userPlanFeatures);
  const resources = useStore($resources);

  const nameField = useField({
    initialValue: variable?.name ?? "",
    validate: (value) =>
      value.trim().length === 0 ? "Name is required" : undefined,
  });
  const nameId = useId();
  const nameFieldElement = (
    <Flex direction="column" css={{ gap: theme.spacing[3] }}>
      <Label htmlFor={nameId}>Name</Label>
      <InputErrorsTooltip
        errors={nameField.error ? [nameField.error] : undefined}
      >
        <InputField
          id={nameId}
          color={nameField.error ? "error" : undefined}
          value={nameField.value}
          onChange={(event) => nameField.onChange(event.target.value)}
          onBlur={nameField.onBlur}
        />
      </InputErrorsTooltip>
    </Flex>
  );

  const [variableType, setVariableType] = useState<VariableType>(() => {
    if (
      variable?.type === "resource" &&
      isLocalResource(JSON.parse(resources.get(variable.resourceId)?.url ?? ""))
    ) {
      return "system-resource";
    }

    if (variable?.type === "parameter" || variable?.type === "resource") {
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

  const typeOptions: Map<
    VariableType,
    { label: ReactNode; description: string }
  > = new Map([
    ["string", { label: "String", description: "Any alphanumeric text." }],
    [
      "number",
      {
        label: "Number",
        description: "Any number, can be used in math expressions.",
      },
    ],
    [
      "boolean",
      { label: "Boolean", description: "A boolean is a true/false switch." },
    ],
    ["json", { label: "JSON", description: "Any JSON value" }],
    [
      "resource",
      {
        label: (
          <Flex direction="row" gap="2" align="center">
            Resource
            {allowDynamicData === false && <ProBadge>Pro</ProBadge>}
          </Flex>
        ),
        description:
          "A Resource is a configuration for secure data fetching. You can safely use secrets in any field.",
      },
    ],
    [
      "system-resource",
      {
        label: (
          <Flex direction="row" gap="2" align="center">
            System Resource
            {allowDynamicData === false && <ProBadge>Pro</ProBadge>}
          </Flex>
        ),
        description: "A System Resource is a configuration for Webstudio data.",
      },
    ],
  ]);

  const typeFieldElement = (
    <Flex direction="column" gap="1">
      <Label>Type</Label>
      <Select
        options={Array.from(typeOptions.keys())}
        getLabel={(option: VariableType) => typeOptions.get(option)?.label}
        getItemProps={(option) => ({
          disabled: option === "resource" && allowDynamicData === false,
        })}
        getDescription={(option) => {
          return (
            <Box css={{ width: theme.spacing[25] }}>
              {typeOptions.get(option)?.description}
            </Box>
          );
        }}
        value={variableType}
        onChange={setVariableType}
      />
    </Flex>
  );

  if (variableType === "parameter") {
    return <ParameterForm ref={formRef} variable={variable} />;
  }
  if (variableType === "string") {
    return (
      <Form onSubmit={onSubmit}>
        {nameFieldElement}
        {typeFieldElement}
        <StringForm ref={ref} variable={variable} nameField={nameField} />
      </Form>
    );
  }
  if (variableType === "number") {
    return (
      <Form onSubmit={onSubmit}>
        {nameFieldElement}
        {typeFieldElement}
        <NumberForm ref={ref} variable={variable} nameField={nameField} />
      </Form>
    );
  }
  if (variableType === "boolean") {
    return (
      <Form onSubmit={onSubmit}>
        {nameFieldElement}
        {typeFieldElement}
        <BooleanForm ref={ref} variable={variable} nameField={nameField} />
      </Form>
    );
  }
  if (variableType === "json") {
    return (
      <Form onSubmit={onSubmit}>
        {nameFieldElement}
        {typeFieldElement}
        <JsonForm ref={ref} variable={variable} nameField={nameField} />
      </Form>
    );
  }

  if (variableType === "resource") {
    return (
      <Form onSubmit={onSubmit}>
        {nameFieldElement}
        {typeFieldElement}
        <ResourceForm ref={ref} variable={variable} nameField={nameField} />
      </Form>
    );
  }

  if (variableType === "system-resource") {
    return (
      <Form onSubmit={onSubmit}>
        {nameFieldElement}
        {typeFieldElement}
        <SystemResourceForm
          ref={ref}
          variable={variable}
          nameField={nameField}
        />
      </Form>
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
  const form = useRef<HTMLFormElement>(null);

  const saveAndClose = () => {
    if (form.current) {
      if (checkCanRequestSubmit(form.current) === false) {
        return;
      }
      form.current.requestSubmit();
    }
    if (panelRef.current) {
      if (panelRef.current.allErrorsVisible === false) {
        panelRef.current.showAllErrors();
        return;
      }
      if (panelRef.current.valid) {
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
            <BindingPopoverProvider
              value={{ containerRef: bindingPopoverContainerRef }}
            >
              <VariablePanel
                ref={panelRef}
                variable={variable}
                formRef={form}
                onSubmit={saveAndClose}
              />
            </BindingPopoverProvider>
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
                  {isLocalResource(
                    JSON.parse(resources.get(variable.resourceId)?.url ?? "")
                  ) === false && (
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
                          if (panelRef.current.allErrorsVisible === false) {
                            panelRef.current.showAllErrors();
                            return;
                          }
                          if (panelRef.current.valid) {
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
