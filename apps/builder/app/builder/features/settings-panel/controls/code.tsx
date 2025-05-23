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
import { CodeEditor } from "~/builder/shared/code-editor";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import {
  useLocalValue,
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
  error?: Error;
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

type Error = { message: string; value: string; expected?: string };

/**
 * Use DOMParser in xml mode to parse potential svg
 */
const parseSvg = (value: string) => {
  const doc = new DOMParser().parseFromString(value, "application/xml");
  const errorNode = doc.querySelector("parsererror");
  if (errorNode) {
    return "";
  }
  return doc.documentElement.outerHTML;
};

const parseHtml = (value: string) => {
  const div = document.createElement("div");
  div.innerHTML = value;
  return div.innerHTML;
};

// The problem is to identify broken HTML and because browser is flexible and always tries to fix it we never
// know if something is actually broken.
// 1. Parse potential SVG with XML parser and serialize
// 2. Compare the original SVG with resulting value
// 3. Parse the HTML using DOM parser and serialize
// 4. Compare the original HTML with resulting value
// 5. We try to minimize the amount of false positives by removing
//    - different amount of whitespace
//    - unifying `boolean=""` is the same as `boolean`
//    - xmlns attirbute which is always reordered first
const validateHtml = (value: string): Error | undefined => {
  const maxChars = 50_000;
  if (value.length > maxChars) {
    return {
      message: `The HTML Embed code exceeds ${maxChars} character limit.`,
      value,
      expected: "",
    };
  }
  const clean = (value: string) => {
    return (
      value
        // Compare without whitespace to avoid false positives
        .replaceAll(/\s/g, "")
        // normalize boolean attributes by turning `boolean=""` into `boolean`
        .replaceAll('=""', "")
        // namespace attribute is always reordered first
        .replaceAll('xmlns="http://www.w3.org/2000/svg"', "")
    );
  };
  // in many cases svg is valid xml so serialize in xml mode first
  // to avoid false positive of auto closing svg tags, for example
  // <path /> -> <path></path>
  const xml = parseSvg(value);
  if (clean(xml) === clean(value)) {
    return;
  }
  const html = parseHtml(value);
  if (clean(html) === clean(value)) {
    return;
  }
  return {
    message: "Entered HTML has a validation error.",
    value,
    expected: html ?? "",
  };
};

export const CodeControl = ({
  meta,
  prop,
  propName,
  computedValue,
  onChange,
}: ControlProps<"code"> | ControlProps<"codetext">) => {
  const [error, setError] = useState<Error>();
  const metaOverride = {
    ...meta,
    control: "text" as const,
  };
  const lang = meta.control === "code" ? meta.language : undefined;
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
                <Text variant="labelsTitleCase">Code Editor</Text>
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
