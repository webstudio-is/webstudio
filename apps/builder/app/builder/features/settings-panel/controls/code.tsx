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
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import {
  validateHtmlEmbedCode,
  type HtmlEmbedCodeError,
} from "@webstudio-is/project-build/runtime/html";
import { validatePrimitiveValue } from "@webstudio-is/project-build/runtime/props";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import {
  type ControlProps,
  VerticalLayout,
  updateExpressionValue,
  $selectedInstanceScope,
  useBindingState,
  humanizeAttribute,
} from "../shared";
import { PropertyLabel } from "../property-label";

const ErrorInfo = ({
  error,
  onAutoFix,
}: {
  error?: HtmlEmbedCodeError;
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
        icon={<InfoCircleIcon color={rawTheme.colors.foregroundDestructive} />}
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
}: ControlProps<"code"> | ControlProps<"codetext">) => {
  const [error, setError] = useState<HtmlEmbedCodeError>();
  const metaOverride = {
    ...meta,
    control: "text" as const,
  };
  const lang = meta.control === "code" ? meta.language : undefined;
  const localValue = useDraftValue(String(computedValue ?? ""), (value) => {
    if (lang === "html") {
      const error = validateHtmlEmbedCode(value);
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
  const label = humanizeAttribute(metaOverride.label || propName);

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
      <BindingControl>
        <CodeEditor
          lang={lang}
          title={
            <DialogTitle
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
          readOnly={overwritable === false}
          invalid={error !== undefined}
          value={localValue.value}
          onChange={(value) => {
            setError(undefined);
            localValue.set(value);
          }}
          onChangeComplete={localValue.save}
        />
        <BindingPopover
          scope={scope}
          aliases={aliases}
          validate={(value) => validatePrimitiveValue(value, label)}
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
