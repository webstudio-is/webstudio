import { useStore } from "@nanostores/react";
import { CodeEditor } from "~/builder/shared/code-editor";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import {
  useLocalValue,
  type ControlProps,
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
import { humanizeString } from "~/shared/string-utils";

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

// The problem is to identify broken HTML and because browser is flexible and always tries to fix it we never
// know if something is actually broken.
// 1. Parse the HTML using DOM
// 2. Get HTML via innerHTML
// 3. Compare the original HTML with innerHTML
// 4. We try to minimize the amount of false positives by removing
//    - different amount of whitespace
//    - unifying `boolean=""` is the same as `boolean`
const validateHtml = (value: string): Error | undefined => {
  const div = document.createElement("div");
  div.innerHTML = value;
  const expected = div.innerHTML;
  const clean = (value: string) => {
    return (
      value
        // Compare without whitespace to avoid false positives
        .replace(/\s/g, "")
        // normalize boolean attributes by turning `boolean=""` into `boolean`
        .replace('=""', "")
    );
  };
  if (clean(value) !== clean(expected)) {
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
}: ControlProps<"code"> | ControlProps<"codetext">) => {
  const [error, setError] = useState<Error>();
  const metaOverride = {
    ...meta,
    control: "text" as const,
  };
  const lang = meta.control === "code" ? "html" : undefined;
  const localValue = useLocalValue(String(computedValue ?? ""), (value) => {
    if (lang === "html") {
      const error = validateHtml(value);
      setError(error);

      if (error) {
        return;
      }
    }

    if (prop?.type === "expression") {
      updateExpressionValue(prop.value, value);
    } else {
      onChange({ type: "string", value });
    }
  });
  const label = humanizeString(metaOverride.label || propName);

  const { scope, aliases } = useStore($selectedInstanceScope);
  const expression =
    prop?.type === "expression" ? prop.value : JSON.stringify(computedValue);
  const { overwritable, variant } = useBindingState(
    prop?.type === "expression" ? prop.value : undefined
  );

  const errorInfo = (
    <ErrorInfo
      error={error}
      onAutoFix={() => {
        if (error) {
          setError(undefined);
          localValue.set(error.expected);
        }
      }}
    />
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
          {errorInfo}
        </Flex>
      }
      deletable={deletable}
      onDelete={onDelete}
    >
      <BindingControl>
        <CodeEditor
          lang={lang}
          title={
            <Flex gap="1" align="center">
              <Text variant="labelsTitleCase">Code Editor</Text>
              {errorInfo}
            </Flex>
          }
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
