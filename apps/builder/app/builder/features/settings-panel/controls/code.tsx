import { useStore } from "@nanostores/react";
import { HtmlEditor } from "~/builder/shared/html-editor";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import {
  useLocalValue,
  type ControlProps,
  getLabel,
  VerticalLayout,
  Label,
  updateExpressionValue,
  $selectedInstanceScope,
  useBindingState,
} from "../shared";
import { useState } from "react";
import {
  Button,
  Flex,
  SmallIconButton,
  Text,
  Tooltip,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import { InfoCircleIcon } from "@webstudio-is/icons";

const ErrorInfo = ({
  error,
  onAutoFix,
}: {
  error?: Error;
  onAutoFix: () => void;
}) => {
  if (error === undefined) {
    return;
  }
  const errorContent = (
    <Flex direction="column" gap="2" css={{ width: theme.spacing[28] }}>
      <Text>
        Entered HTML has a validation error. Do you want us to fix it?
      </Text>
      <Button
        color="neutral-destructive"
        onClick={() => {
          onAutoFix();
        }}
      >
        Fix automatically
      </Button>
    </Flex>
  );

  return (
    <Tooltip content={errorContent} delayDuration={0}>
      <SmallIconButton
        icon={<InfoCircleIcon color={rawTheme.colors.foregroundDestructive} />}
      />
    </Tooltip>
  );
};

type Error = { message: string; value: string; expected: string };

const validateHtml = (value: string): Error | undefined => {
  // This is basically what browser does when innerHTML is set
  // but isolated within temporary element
  // so the result is correct markup
  const div = document.createElement("div");
  div.innerHTML = value;
  const expected = div.innerHTML;
  // We don't need to show error for unnecessary whitespace.
  if (value.replace(/\s/g, "") !== expected.replace(/\s/g, "")) {
    return { message: "Invalid HTML detected", value, expected };
  }
};

export const CodeControl = ({
  meta,
  prop,
  propName,
  computedValue,
  deletable,
  onChange,
  onDelete,
}: ControlProps<"code">) => {
  const [error, setError] = useState<Error>();
  const metaOverride = {
    ...meta,
    control: "text" as const,
  };
  const localValue = useLocalValue(String(computedValue ?? ""), (value) => {
    const error = validateHtml(value);
    setError(error);

    if (error) {
      return;
    }

    if (prop?.type === "expression") {
      updateExpressionValue(prop.value, value);
    } else {
      onChange({ type: "string", value });
    }
  });
  const label = getLabel(metaOverride, propName);

  const { scope, aliases } = useStore($selectedInstanceScope);
  const expression =
    prop?.type === "expression" ? prop.value : JSON.stringify(computedValue);
  const { overwritable, variant } = useBindingState(
    prop?.type === "expression" ? prop.value : undefined
  );

  return (
    <VerticalLayout
      label={
        <Flex gap="1" align="center">
          <Label
            description={metaOverride.description}
            readOnly={overwritable === false}
          >
            {label}
          </Label>
          <ErrorInfo
            error={error}
            onAutoFix={() => {
              if (error) {
                setError(undefined);
                localValue.set(error.expected);
              }
            }}
          />
        </Flex>
      }
      deletable={deletable}
      onDelete={onDelete}
    >
      <BindingControl>
        <HtmlEditor
          readOnly={overwritable === false}
          invalid={error !== undefined}
          value={localValue.value}
          onChange={(value) => {
            setError(undefined);
            localValue.set(value);
          }}
          onBlur={localValue.save}
        />
        <BindingPopover
          scope={scope}
          aliases={aliases}
          validate={(value) => {
            if (value !== undefined && typeof value !== "string") {
              return `${label} expects a string value`;
            }
          }}
          variant={variant}
          value={expression}
          onChange={(newExpression) =>
            onChange({ type: "expression", value: newExpression })
          }
          onRemove={(evaluatedValue) =>
            onChange({ type: "string", value: String(evaluatedValue) })
          }
        />
      </BindingControl>
    </VerticalLayout>
  );
};
