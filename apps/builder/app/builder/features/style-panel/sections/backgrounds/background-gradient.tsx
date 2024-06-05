import type { InvalidValue, RgbValue } from "@webstudio-is/css-engine";
import { parseCssValue, parseBackground } from "@webstudio-is/css-data";
import {
  Flex,
  TextArea,
  textVariants,
  theme,
} from "@webstudio-is/design-system";
import { useEffect, useRef, useState } from "react";
import type { ControlProps } from "../../controls";
import { NonResetablePropertyName } from "../../shared/property-name";

type IntermediateValue = {
  type: "intermediate";
  value: string;
};

export const BackgroundGradient = (
  props: Omit<ControlProps, "property" | "items"> & {
    setBackgroundColor: (color: RgbValue) => void;
  }
) => {
  const property = "backgroundImage";
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const styleInfo = props.currentStyle[property];
  const styleValue = styleInfo?.value;

  const [intermediateValue, setIntermediateValue] = useState<
    IntermediateValue | InvalidValue | undefined
  >(undefined);

  const textAreaValue =
    intermediateValue?.value ??
    (styleValue?.type === "unparsed" ? styleValue.value : undefined);

  const handleChange = (value: string) => {
    setIntermediateValue({
      type: "intermediate",
      value,
    });

    // This doesn't have the same behavior as CssValueInput.
    // However, it's great to see the immediate results when making gradient changes,
    // especially until we have a better gradient tool.
    const newValue = parseCssValue(property, value);

    if (newValue.type === "unparsed") {
      props.setProperty(property)(newValue, { isEphemeral: true });
      return;
    }

    // Set backgroundImage at layer to none if it's invalid
    props.setProperty(property)(
      { type: "keyword", value: "none" },
      { isEphemeral: true }
    );
  };

  const handleOnComplete = () => {
    if (intermediateValue === undefined) {
      return;
    }

    const { backgroundImage, backgroundColor } = parseBackground(
      intermediateValue.value
    );

    if (backgroundColor !== undefined) {
      props.setBackgroundColor(backgroundColor);
    }

    if (backgroundImage.type !== "invalid") {
      setIntermediateValue(undefined);
      props.setProperty(property)(backgroundImage);
      return;
    }

    // Set invalid state
    setIntermediateValue({ type: "invalid", value: intermediateValue.value });
    props.deleteProperty(property, { isEphemeral: true });
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
    <Flex
      direction="column"
      css={{
        gridColumn: "span 2",
        px: theme.spacing[9],
        paddingTop: theme.spacing[5],
        paddingBottom: theme.spacing[9],
        gap: theme.spacing[3],
      }}
    >
      <NonResetablePropertyName
        style={props.currentStyle}
        description={
          <>
            Paste a CSS gradient, for example:
            <br />
            <br />
            linear-gradient(...)
            <br />
            <br />
            If pasting from Figma, remove the "background" property name.
          </>
        }
        properties={[property]}
        label="Code"
      />
      <TextArea
        ref={textAreaRef}
        css={{ ...textVariants.mono }}
        rows={2}
        autoGrow
        maxRows={4}
        name="description"
        value={textAreaValue ?? ""}
        color={intermediateValue?.type === "invalid" ? "error" : undefined}
        onChange={handleChange}
        onBlur={handleOnComplete}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            handleOnComplete();
            event.preventDefault();
          }

          if (event.key === "Escape") {
            if (intermediateValue === undefined) {
              return;
            }
            props.deleteProperty(property, { isEphemeral: true });
            setIntermediateValue(undefined);
            event.preventDefault();
          }
        }}
      />
    </Flex>
  );
};
