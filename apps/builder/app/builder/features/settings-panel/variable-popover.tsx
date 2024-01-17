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
} from "react";
import { mergeRefs } from "@react-aria/utils";
import {
  Box,
  Flex,
  FloatingPanelPopover,
  FloatingPanelPopoverContent,
  FloatingPanelPopoverTitle,
  FloatingPanelPopoverTrigger,
  InputErrorsTooltip,
  InputField,
  Label,
  ProBadge,
  ScrollArea,
  Select,
  SelectItem,
  Switch,
  theme,
} from "@webstudio-is/design-system";
import { validateExpression } from "@webstudio-is/react-sdk";
import type { DataSource } from "@webstudio-is/sdk";
import {
  ExpressionEditor,
  formatValue,
} from "~/builder/shared/expression-editor";
import {
  $dataSources,
  $resources,
  $selectedInstanceSelector,
} from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync";
import { humanizeString } from "~/shared/string-utils";
import {
  useField,
  type Field,
  composeFields,
  type ComposedFields,
} from "~/shared/form-utils";
import { $userPlanFeatures } from "~/builder/shared/nano-states";
import { BindingPopoverProvider } from "~/builder/shared/binding-popover";
import { useSideOffset } from "~/builder/shared/floating-panel";
import { ResourceForm } from "./resource-panel";

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
    code = validateExpression(code, {
      optional: true,
      transformIdentifier: (id) => {
        ids.add(id);
        return id;
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
  | "parameter";

type PanelApi = ComposedFields & {
  save: () => void;
};

const ParameterForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource; nameField: Field<string> }
>(({ variable, nameField }, ref) => {
  const form = composeFields(nameField);
  useImperativeHandle(ref, () => ({
    ...form,
    save: () => {
      // only existing parameter variables can be renamed
      if (variable === undefined) {
        return;
      }
      const name = nameField.value;
      serverSyncStore.createTransaction([$dataSources], (dataSources) => {
        dataSources.set(variable.id, { ...variable, name });
      });
    },
  }));
  return <></>;
});
ParameterForm.displayName = "ParameterForm";

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
      <InputField
        id={valueId}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
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
    variable?: DataSource;
  }
>(({ variable }, ref) => {
  const { allowResourceVariables } = useStore($userPlanFeatures);

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

  const [type, setType] = useState<VariableType>(() => {
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
  const typeOptions: VariableType[] = [
    "string",
    "number",
    "boolean",
    "json",
    "resource",
  ];
  const getTypeLabel = (value: VariableType) =>
    value === "json" ? "JSON" : humanizeString(value);
  const typeFieldElement = (
    <Flex direction="column" css={{ gap: theme.spacing[3] }}>
      <Label>Type</Label>
      <Select<VariableType>
        options={typeOptions}
        getLabel={getTypeLabel}
        value={type}
        onChange={setType}
      >
        {typeOptions.map((option) => (
          <SelectItem
            key={option}
            value={option}
            textValue={getTypeLabel(option)}
            disabled={option === "resource" && allowResourceVariables === false}
          >
            {getTypeLabel(option)}
            {option === "resource" && allowResourceVariables === false && (
              <Box css={{ display: "inline-block", ml: theme.spacing[3] }}>
                <ProBadge />
              </Box>
            )}
          </SelectItem>
        ))}
      </Select>
    </Flex>
  );

  if (type === "parameter") {
    return (
      <>
        {nameFieldElement}
        <ParameterForm ref={ref} variable={variable} nameField={nameField} />
      </>
    );
  }
  if (type === "string") {
    return (
      <>
        {nameFieldElement}
        {typeFieldElement}
        <StringForm ref={ref} variable={variable} nameField={nameField} />
      </>
    );
  }
  if (type === "number") {
    return (
      <>
        {nameFieldElement}
        {typeFieldElement}
        <NumberForm ref={ref} variable={variable} nameField={nameField} />
      </>
    );
  }
  if (type === "boolean") {
    return (
      <>
        {nameFieldElement}
        {typeFieldElement}
        <BooleanForm ref={ref} variable={variable} nameField={nameField} />
      </>
    );
  }
  if (type === "json") {
    return (
      <>
        {nameFieldElement}
        {typeFieldElement}
        <JsonForm ref={ref} variable={variable} nameField={nameField} />
      </>
    );
  }
  if (type === "resource") {
    return (
      <>
        {nameFieldElement}
        {typeFieldElement}
        <ResourceForm ref={ref} variable={variable} nameField={nameField} />
      </>
    );
  }
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
  const [isOpen, setOpen] = useState(false);
  const { containerRef } = useContext(VariablePopoverContext);
  const [triggerRef, sideOffsset] = useSideOffset({ isOpen, containerRef });
  const bindingPopoverContainerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<undefined | PanelApi>();
  const saveAndClose = () => {
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
          <FloatingPanelPopoverTitle>Edit Variable</FloatingPanelPopoverTitle>
        )}
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
});

VariablePopoverTrigger.displayName = "VariablePopoverTrigger";
