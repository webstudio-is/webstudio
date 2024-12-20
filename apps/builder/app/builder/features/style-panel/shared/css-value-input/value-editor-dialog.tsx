import {
  NestedInputButton,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import { MaximizeIcon } from "@webstudio-is/icons";
import { useEffect, useState } from "react";
import { EditorDialog } from "~/builder/shared/code-editor-base";
import { CssFragmentEditorContent } from "../css-fragment";
import type {
  CssValueInputValue,
  IntermediateStyleValue,
} from "./css-value-input";
import {
  type InvalidValue,
  type StyleProperty,
  type StyleValue,
} from "@webstudio-is/css-engine";
import { parseIntermediateOrInvalidValue } from "./parse-intermediate-or-invalid-value";

export const cssButtonDisplay = "--ws-css-value-input-maximize-button-display";

// Hand-picking values that are considered complex and should get a maximize button for the dialog.
// Not showing the maximize everywhere because most values don't need that and it takes space.
export const isComplexValue = (value: CssValueInputValue) => {
  if (value.type === "unparsed" || value.type === "function") {
    return true;
  }

  if (value.type === "tuple" || value.type === "layers") {
    for (const nestedValue of value.value) {
      const nestedValueIsComplex = isComplexValue(nestedValue);
      if (nestedValueIsComplex) {
        return true;
      }
    }
  }

  return false;
};

export const ValueEditorDialog = ({
  property,
  value,
  onChangeComplete,
}: {
  property: StyleProperty;
  value: string;
  onChangeComplete: (value: StyleValue) => void;
}) => {
  const [intermediateValue, setIntermediateValue] = useState<
    IntermediateStyleValue | InvalidValue | undefined
  >({ type: "intermediate", value });

  useEffect(() => {
    setIntermediateValue({ type: "intermediate", value });
  }, [value]);

  const handleChange = (value: string) => {
    const parsedValue = parseIntermediateOrInvalidValue(property, {
      type: "intermediate",
      value,
    });

    if (parsedValue.type === "invalid") {
      setIntermediateValue({
        type: "invalid",
        value,
      });
      return;
    }

    if (parsedValue) {
      setIntermediateValue({
        type: "intermediate",
        value,
      });
    }

    return parsedValue;
  };

  const handleChangeComplete = (value: string) => {
    const parsedValue = handleChange(value);
    if (parsedValue) {
      onChangeComplete(parsedValue);
    }
  };

  return (
    <EditorDialog
      title="CSS Value"
      placement="bottom"
      height={200}
      width={Number(rawTheme.sizes.sidebarWidth)}
      content={
        <CssFragmentEditorContent
          autoFocus
          value={intermediateValue?.value ?? value ?? ""}
          invalid={intermediateValue?.type === "invalid"}
          showShortcuts
          onChange={handleChange}
          onChangeComplete={handleChangeComplete}
        />
      }
    >
      <NestedInputButton
        tabIndex={-1}
        css={{
          display: `var(${cssButtonDisplay}, none)`,
          background: theme.colors.backgroundControls,
          '&[data-state="open"]': {
            display: "block",
          },
        }}
      >
        <MaximizeIcon size={12} />
      </NestedInputButton>
    </EditorDialog>
  );
};
