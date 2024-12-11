import { NestedInputButton } from "@webstudio-is/design-system";
import { MaximizeIcon } from "@webstudio-is/icons";
import { useEffect, useState } from "react";
import { EditorDialog } from "~/builder/shared/code-editor-base";
import { CssFragmentEditor } from "../css-fragment";
import type { IntermediateStyleValue } from "./css-value-input";
import {
  type InvalidValue,
  type StyleProperty,
  type StyleValue,
} from "@webstudio-is/css-engine";
import { parseIntermediateOrInvalidValue } from "./parse-intermediate-or-invalid-value";

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

  return (
    <EditorDialog
      title="CSS Value"
      content={
        <CssFragmentEditor
          invalid={intermediateValue?.type === "invalid"}
          autoFocus
          value={intermediateValue?.value ?? value ?? ""}
          onChange={handleChange}
          onBlur={handleComplete}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleComplete();
              event.preventDefault();
            }
          }}
        />
      }
    >
      <NestedInputButton tabIndex={-1}>
        <MaximizeIcon size={12} />
      </NestedInputButton>
    </EditorDialog>
  );
};
