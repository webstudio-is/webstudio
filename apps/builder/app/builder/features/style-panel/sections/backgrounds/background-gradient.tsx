import type {
  InvalidValue,
  LayersValue,
  StyleValue,
} from "@webstudio-is/css-engine";
import { parseCssValue } from "@webstudio-is/css-data";
import {
  Flex,
  Label,
  Text,
  TextArea,
  textVariants,
  theme,
  Tooltip,
} from "@webstudio-is/design-system";
import { useEffect, useRef, useState } from "react";
import { parseCssFragment } from "../../shared/parse-css-fragment";
import { InfoCircleIcon } from "@webstudio-is/icons";
import { setProperty } from "../../shared/use-style-data";
import { useComputedStyleDecl } from "../../shared/model";
import {
  editRepeatedStyleItem,
  getRepeatedStyleItem,
  setRepeatedStyleItem,
} from "../../shared/repeated-style";

type IntermediateValue = {
  type: "intermediate";
  value: string;
};

const isTransparent = (color: StyleValue) =>
  color.type === "keyword" && color.value === "transparent";

export const BackgroundGradient = ({ index }: { index: number }) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const property = "backgroundImage";
  const styleDecl = useComputedStyleDecl(property);
  const styleValue = getRepeatedStyleItem(styleDecl, index);

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
      setRepeatedStyleItem(styleDecl, index, newValue, { isEphemeral: true });
      return;
    }

    // Set backgroundImage at layer to none if it's invalid
    setRepeatedStyleItem(
      styleDecl,
      index,
      { type: "keyword", value: "none" },
      { isEphemeral: true }
    );
  };

  const handleOnComplete = () => {
    if (intermediateValue === undefined) {
      return;
    }

    const parsed = parseCssFragment(intermediateValue.value, "background");
    const backgroundImage = parsed.get("backgroundImage");
    const backgroundColor = parsed.get("backgroundColor");
    const layers: LayersValue =
      backgroundImage?.type === "layers"
        ? backgroundImage
        : { type: "layers", value: [] };
    const [firstLayer] = layers.value;

    // set invalid state
    if (
      backgroundColor?.type === "invalid" ||
      layers.value.length === 0 ||
      firstLayer.type === "invalid"
    ) {
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
      setProperty("backgroundColor")(backgroundColor);
    }
    // insert all new layers at current position
    editRepeatedStyleItem(
      [styleDecl],
      index,
      new Map([["backgroundImage", layers]])
    );
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
      <Label>
        <Flex align="center" gap="1">
          Code
          <Tooltip
            variant="wrapped"
            content={
              <Text>
                Paste a CSS gradient, for example:
                <br />
                <br />
                linear-gradient(...)
                <br />
                <br />
                If pasting from Figma, remove the "background" property name.
              </Text>
            }
          >
            <InfoCircleIcon />
          </Tooltip>
        </Flex>
      </Label>
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
        }}
      />
    </Flex>
  );
};
