import {
  NestedInputButton,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import { MaximizeIcon } from "@webstudio-is/icons";
import { useEffect, useRef, useState } from "react";
import { EditorDialog } from "~/builder/shared/code-editor-base";
import { CssFragmentEditorContent } from "../css-fragment";
import type { IntermediateStyleValue } from "./css-value-input";
import {
  type InvalidValue,
  type StyleProperty,
  type StyleValue,
} from "@webstudio-is/css-engine";
import { parseIntermediateOrInvalidValue } from "./parse-intermediate-or-invalid-value";

export const cssButtonDisplay = "--ws-css-value-input-maximize-button-display";

const width = parseFloat(rawTheme.sizes.sidebarWidth);

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

  const triggerRef = useRef<HTMLButtonElement>(null);

  const [rect, setRect] = useState(() => ({
    height: 200,
    width,
    x: window.innerWidth - width,
    y: 0,
  }));

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      setRect({
        ...rect,
        y: triggerRect.y,
      });
    }
  };

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
      onOpenChange={handleOpenChange}
      {...rect}
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
        ref={triggerRef}
      >
        <MaximizeIcon size={12} />
      </NestedInputButton>
    </EditorDialog>
  );
};
