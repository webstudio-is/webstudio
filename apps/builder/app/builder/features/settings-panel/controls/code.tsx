import { useStore } from "@nanostores/react";
import { useState } from "react";
import {
  Button,
  DialogClose,
  DialogMaximize,
  DialogTitle,
  DialogTitleActions,
  Flex,
  SmallIconButton,
  Text,
  Tooltip,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import { InfoCircleIcon } from "@webstudio-is/icons";
import { CodeEditor } from "~/shared/code-editor";
import {
  BindableExpressionControl,
  updateExpressionValue,
  useBindingState,
} from "~/builder/shared/bindable-expression";
import {
  validateHtmlEmbedCode,
  type HtmlEmbedCodeError,
} from "@webstudio-is/project-build/runtime";
import { validatePrimitiveValue } from "@webstudio-is/project-build/runtime";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import {
  type ControlProps,
  VerticalLayout,
  $selectedInstanceScope,
  humanizeAttribute,
} from "../shared";
import { PropertyLabel } from "../property-label";
export type CodeIssue = HtmlEmbedCodeError & {
  severity?: "error" | "warning";
};

export type CodeControlBehavior = {
  autoSave?: boolean;
  formatValue: (value: unknown) => string;
  processValue: (
    value: string
  ) =>
    | { success: false; issue: CodeIssue }
    | { success: true; value: string; issue?: CodeIssue };
  validateBinding: (value: unknown, label: string) => string | undefined;
  getFixedValue: (
    value: unknown,
    label: string
  ) => { success: true; value: string } | { success: false; message: string };
};

const ErrorInfo = ({
  error,
  onAutoFix,
}: {
  error?: CodeIssue;
  onAutoFix: () => void;
}) => {
  if (error === undefined) {
    return;
  }
  const errorContent = error.expected ? (
    <Flex direction="column" gap="2" css={{ width: theme.spacing[28] }}>
      <Text>{error.message} Do you want us to fix it?</Text>
      <Button
        color="neutral-destructive"
        onClick={() => {
          onAutoFix();
        }}
      >
        Fix automatically
      </Button>
    </Flex>
  ) : (
    <Flex direction="column" gap="2" css={{ width: theme.spacing[28] }}>
      <Text>{error.message}</Text>
    </Flex>
  );

  return (
    <Tooltip content={errorContent} delayDuration={0}>
      <SmallIconButton
        icon={
          <InfoCircleIcon
            color={
              error.severity === "warning"
                ? rawTheme.colors.foregroundSubtle
                : rawTheme.colors.foregroundDestructive
            }
          />
        }
      />
    </Tooltip>
  );
};

export const CodeControl = ({
  meta,
  prop,
  propName,
  computedValue,
  onChange,
  behavior,
}: (ControlProps<"code"> | ControlProps<"codetext">) & {
  behavior?: CodeControlBehavior;
}) => {
  const [error, setError] = useState<CodeIssue>();
  const metaOverride = {
    ...meta,
    control: "text" as const,
  };
  const lang = meta.control === "code" ? meta.language : undefined;
  const label = humanizeAttribute(metaOverride.label || propName);
  const editorValue = behavior
    ? behavior.formatValue(computedValue)
    : String(computedValue ?? "");
  const localValue = useDraftValue(
    editorValue,
    (value) => {
      let storedValue = value;

      if (behavior) {
        const result = behavior.processValue(value);
        setError(result.issue);
        if (result.success === false) {
          return;
        }
        storedValue = result.value;
      }

      if (behavior === undefined && lang === "html") {
        const error = validateHtmlEmbedCode(value);
        setError(error);

        if (error) {
          return;
        }
      }

      if (prop?.type === "expression") {
        updateExpressionValue(prop.value, storedValue);
      } else {
        onChange({ type: "string", value: storedValue });
      }
    },
    { autoSave: behavior?.autoSave ?? true }
  );

  const { scope, aliases } = useStore($selectedInstanceScope);
  const expression =
    prop?.type === "expression" ? prop.value : JSON.stringify(computedValue);
  const { overwritable } = useBindingState(
    prop?.type === "expression" ? prop.value : undefined
  );

  const errorInfo = (
    <ErrorInfo
      error={error}
      onAutoFix={() => {
        if (error?.expected) {
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
          <PropertyLabel name={propName} readOnly={overwritable === false} />
          {errorInfo}
        </Flex>
      }
    >
      <BindableExpressionControl
        expression={expression}
        value={localValue.value}
        bound={prop?.type === "expression"}
        scope={scope}
        aliases={aliases}
        validate={(value) =>
          behavior
            ? behavior.validateBinding(value, label)
            : validatePrimitiveValue(value, label)
        }
        onChangeValue={(value) => onChange({ type: "string", value })}
        onChangeExpression={(value) => onChange({ type: "expression", value })}
        onRemove={(value) => {
          if (behavior) {
            const fixedValue = behavior.getFixedValue(value, label);
            if (fixedValue.success === false) {
              setError({
                message: fixedValue.message,
                value: String(value),
              });
              return;
            }
            onChange({ type: "string", value: fixedValue.value });
            return;
          }
          onChange({ type: "string", value: String(value) });
        }}
        renderControl={({ readOnly }) => (
          <CodeEditor
            lang={lang}
            title={
              <DialogTitle
                maximizable
                suffix={
                  <DialogTitleActions>
                    <DialogMaximize />
                    <DialogClose />
                  </DialogTitleActions>
                }
              >
                <Flex gap="1" align="center">
                  <Text variant="labels">Code editor</Text>
                  {errorInfo}
                </Flex>
              </DialogTitle>
            }
            readOnly={readOnly}
            invalid={error !== undefined && error.severity !== "warning"}
            value={localValue.value}
            onChange={(value) => {
              setError(undefined);
              localValue.set(value);
            }}
            onChangeComplete={localValue.save}
          />
        )}
      />
    </VerticalLayout>
  );
};
