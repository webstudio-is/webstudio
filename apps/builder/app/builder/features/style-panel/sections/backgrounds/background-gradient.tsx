import {
  toValue,
  type InvalidValue,
  type StyleValue,
} from "@webstudio-is/css-engine";
import { parseCssValue } from "@webstudio-is/css-data";
import { Flex, Label, Text, theme, Tooltip } from "@webstudio-is/design-system";
import { useEffect, useRef, useState } from "react";
import { InfoCircleIcon } from "@webstudio-is/icons";
import { setProperty } from "../../shared/use-style-data";
import { useComputedStyleDecl } from "../../shared/model";
import {
  editRepeatedStyleItem,
  setRepeatedStyleItem,
} from "../../shared/repeated-style";
import {
  parseCssFragment,
  CssFragmentEditor,
  CssFragmentEditorContent,
} from "../../shared/css-fragment";

type IntermediateValue = {
  type: "intermediate";
  value: string;
};

const isTransparent = (color: StyleValue) =>
  color.type === "keyword" && color.value === "transparent";

export const BackgroundGradient = ({ index }: { index: number }) => {
  const styleDecl = useComputedStyleDecl("background-image");
  let styleValue = styleDecl.cascadedValue;
  if (styleValue.type === "layers") {
    styleValue = styleValue.value[index];
  }

  const [intermediateValue, setIntermediateValue] = useState<
    IntermediateValue | InvalidValue | undefined
  >(undefined);

  const textAreaValue = intermediateValue?.value ?? toValue(styleValue);

  const handleChange = (value: string) => {
    setIntermediateValue({
      type: "intermediate",
      value,
    });

    // This doesn't have the same behavior as CssValueInput.
    // However, it's great to see the immediate results when making gradient changes,
    // especially until we have a better gradient tool.
    const newValue = parseCssValue("backgroundImage", value);

    if (newValue.type === "unparsed" || newValue.type === "var") {
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

    const parsed = parseCssFragment(intermediateValue.value, [
      "background-image",
      "background",
    ]);
    const backgroundImage = parsed.get("background-image");
    const backgroundColor = parsed.get("background-color");

    // set invalid state
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
    // insert all new layers at current position
    editRepeatedStyleItem(
      [styleDecl],
      index,
      new Map([["background-image", backgroundImage]])
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
        px: theme.spacing[5],
        py: theme.spacing[5],
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
      <CssFragmentEditor
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
    </Flex>
  );
};
