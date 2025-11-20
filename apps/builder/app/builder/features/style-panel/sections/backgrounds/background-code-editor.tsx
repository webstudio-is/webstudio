import type { InvalidValue, StyleValue } from "@webstudio-is/css-engine";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CssFragmentEditor,
  CssFragmentEditorContent,
  getCodeEditorCssVars,
  parseCssFragment,
} from "../../shared/css-fragment";
import { PropertyInlineLabel } from "../../property-label";
import { toValue } from "@webstudio-is/css-engine";
import { setProperty } from "../../shared/use-style-data";
import {
  editRepeatedStyleItem,
  setRepeatedStyleItem,
} from "../../shared/repeated-style";
import { useComputedStyleDecl } from "../../shared/model";
import { InputErrorsTooltip } from "@webstudio-is/design-system";

type IntermediateValue = {
  type: "intermediate";
  value: string;
};

const isTransparent = (color: StyleValue) =>
  color.type === "keyword" && color.value === "transparent";

type BackgroundCodeEditorProps = {
  index: number;
  /**
   * Optional custom validation and error handling
   */
  onValidate?: (
    value: string,
    parsed: Map<string, StyleValue>
  ) => string[] | undefined;
};

export const BackgroundCodeEditor = ({
  index,
  onValidate,
}: BackgroundCodeEditorProps) => {
  const styleDecl = useComputedStyleDecl("background-image");
  let styleValue = styleDecl.cascadedValue;
  if (styleValue.type === "layers") {
    styleValue = styleValue.value[index];
  }

  const [intermediateValue, setIntermediateValue] = useState<
    IntermediateValue | InvalidValue | undefined
  >(undefined);

  const [errors, setErrors] = useState<string[]>([]);

  // Reset intermediate value when styleValue changes (e.g., from UI updates)
  useEffect(() => {
    setIntermediateValue(undefined);
  }, [styleValue]);

  const textAreaValue = intermediateValue?.value ?? toValue(styleValue);

  const handleChange = useCallback(
    (value: string) => {
      setIntermediateValue({
        type: "intermediate",
        value,
      });

      const parsed = parseCssFragment(value, [
        "background-image",
        "background",
      ]);
      const newValue = parsed.get("background-image");

      if (newValue === undefined || newValue?.type === "invalid") {
        setIntermediateValue({
          type: "invalid",
          value: value,
        });
        return;
      }

      // Run custom validation if provided
      if (onValidate) {
        const validationErrors = onValidate(value, parsed);
        if (validationErrors && validationErrors.length > 0) {
          setErrors(validationErrors);
          setIntermediateValue({
            type: "invalid",
            value: value,
          });
          return;
        }
        setErrors([]);
      }

      setRepeatedStyleItem(styleDecl, index, newValue, { isEphemeral: true });
    },
    [index, onValidate, styleDecl]
  );

  const handleOnComplete = useCallback(() => {
    if (intermediateValue === undefined) {
      return;
    }

    const parsed = parseCssFragment(intermediateValue.value, [
      "background-image",
      "background",
    ]);
    const backgroundImage = parsed.get("background-image");
    const backgroundColor = parsed.get("background-color");

    if (backgroundColor?.type === "invalid" || backgroundImage === undefined) {
      setIntermediateValue({ type: "invalid", value: intermediateValue.value });
      if (styleValue) {
        setRepeatedStyleItem(styleDecl, index, styleValue, {
          isEphemeral: true,
        });
      }
      return;
    }
    setIntermediateValue(undefined);
    if (backgroundColor && isTransparent(backgroundColor) === false) {
      setProperty("background-color")(backgroundColor);
    }
    editRepeatedStyleItem(
      [styleDecl],
      index,
      new Map([["background-image", backgroundImage]])
    );
  }, [index, intermediateValue, styleDecl, styleValue]);

  const handleOnCompleteRef = useRef(handleOnComplete);
  useEffect(() => {
    handleOnCompleteRef.current = handleOnComplete;
  }, [handleOnComplete]);

  useEffect(() => {
    return () => {
      handleOnCompleteRef.current();
    };
  }, []);

  return (
    <>
      <PropertyInlineLabel
        label="Code"
        description="Paste a CSS gradient or image, for example: linear-gradient(...) or url('image.jpg'). If pasting from Figma, remove the 'background' property name."
      />
      <InputErrorsTooltip errors={errors}>
        <CssFragmentEditor
          css={getCodeEditorCssVars({ minHeight: "4lh", maxHeight: "4lh" })}
          content={
            <CssFragmentEditorContent
              invalid={intermediateValue?.type === "invalid"}
              autoFocus={styleValue.type === "var"}
              value={textAreaValue ?? ""}
              onChange={handleChange}
              onChangeComplete={handleOnComplete}
            />
          }
        />
      </InputErrorsTooltip>
    </>
  );
};
