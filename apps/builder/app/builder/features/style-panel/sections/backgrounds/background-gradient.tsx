import { TextArea, theme } from "@webstudio-is/design-system";
import { useEffect, useRef, useState } from "react";
import { parseCssValue } from "../../shared/parse-css-value";
import type { ControlProps } from "../../style-sections";

export const BackgroundGradient = (
  props: Omit<ControlProps, "property" | "items">
) => {
  const property = "backgroundImage";

  const styleInfo = props.currentStyle[property];
  const styleValue = styleInfo?.value;

  // In gradient section we want to show gradient data only
  const [intermediateValue, setIntermediateValue] = useState<
    string | undefined
  >(undefined);

  const value =
    intermediateValue ??
    (styleValue?.type === "unparsed" ? styleValue.value : undefined);

  const handleChange = (value: string, isEphemeral: boolean) => {
    setIntermediateValue(isEphemeral ? value : undefined);

    const newValue = parseCssValue(property, value);

    if (newValue.type === "unparsed") {
      props.setProperty(property)(newValue, { isEphemeral });
      return;
    }

    props.deleteProperty(property, { isEphemeral });
  };

  const handleOnComplete = () => {
    if (intermediateValue !== undefined) {
      handleChange(intermediateValue, false);
    }
  };

  const handleOnCompleteRef = useRef(handleOnComplete);
  handleOnCompleteRef.current = handleOnComplete;

  // Blur wouldn't fire if user clicks outside of the FloatingPanel
  useEffect(() => {
    return () => {
      handleOnCompleteRef.current();
    };
  }, []);

  return (
    <TextArea
      css={{ minHeight: theme.spacing[14] }}
      rows={2}
      name="description"
      disabled={props.disabled}
      value={value}
      onChange={(event) => {
        handleChange(event.target.value, true);
      }}
      onBlur={handleOnComplete}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          handleOnComplete();
        }
      }}
    />
  );
};
