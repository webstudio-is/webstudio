import { NestedInputButton, theme } from "@webstudio-is/design-system";
import { MaximizeIcon } from "@webstudio-is/icons";
import { useEffect, useRef, useState } from "react";
import {
  EditorDialog,
  type EditorApi,
} from "~/builder/shared/code-editor-base";
import { CssFragmentEditorContent } from "../css-fragment";
import type { IntermediateStyleValue } from "./css-value-input";
import {
  type InvalidValue,
  type StyleProperty,
  type StyleValue,
} from "@webstudio-is/css-engine";
import { parseIntermediateOrInvalidValue } from "./parse-intermediate-or-invalid-value";

export const cssButtonDisplay = "--ws-css-value-input-maximize-button-display";

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
    setIntermediateValue({
      type: "intermediate",
      value,
    });
  };

  const handleComplete = () => {
    if (intermediateValue === undefined) {
      return;
    }
    const parsedValue = parseIntermediateOrInvalidValue(
      property,
      intermediateValue
    );

    if (parsedValue?.type === "invalid") {
      setIntermediateValue({
        type: "invalid",
        value: intermediateValue.value,
      });
      return;
    }
    onChangeComplete(parsedValue);
  };

  const editorApiRef = useRef<EditorApi>();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const rectRef = useRef({
    height: 300,
    width: 240,
    x: window.innerWidth - 240,
    y: 0,
  });
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EditorDialog
      title="CSS Value"
      open={isOpen}
      {...rectRef.current}
      content={
        <CssFragmentEditorContent
          autoFocus
          editorApiRef={editorApiRef}
          value={intermediateValue?.value ?? value ?? ""}
          invalid={intermediateValue?.type === "invalid"}
          showShortcuts
          onChange={handleChange}
          onChangeComplete={handleComplete}
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
        onClick={(event) => {
          if (event.currentTarget instanceof HTMLButtonElement === false) {
            return;
          }
          const triggerRect = event.currentTarget.getBoundingClientRect();
          rectRef.current.y = triggerRect.y - rectRef.current.width / 2;
          setIsOpen(true);
        }}
      >
        <MaximizeIcon size={12} />
      </NestedInputButton>
    </EditorDialog>
  );
};
