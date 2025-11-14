import {
  toValue,
  type InvalidValue,
  type StyleValue,
  type RgbValue,
} from "@webstudio-is/css-engine";
import {
  parseCssValue,
  parseLinearGradient,
  reconstructLinearGradient,
  type ParsedGradient,
} from "@webstudio-is/css-data";
import {
  Flex,
  Label,
  Text,
  theme,
  Tooltip,
  GradientPicker,
  Box,
} from "@webstudio-is/design-system";
import { ColorPicker } from "../../shared/color-picker";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { colord, extend } from "colord";
import namesPlugin from "colord/plugins/names";
import { useLocalValue } from "../../../settings-panel/shared";

extend([namesPlugin]);

const defaultGradient: ParsedGradient = {
  stops: [
    {
      color: { type: "rgb", r: 0, g: 0, b: 0, alpha: 1 },
      position: { type: "unit", unit: "%", value: 0 },
    },
    {
      color: { type: "rgb", r: 255, g: 255, b: 255, alpha: 1 },
      position: { type: "unit", unit: "%", value: 100 },
    },
  ],
};

const colordToRgbValue = (instance: ReturnType<typeof colord>) => {
  const rgb = instance.toRgb();
  return {
    type: "rgb" as const,
    r: rgb.r,
    g: rgb.g,
    b: rgb.b,
    alpha: rgb.a,
  } satisfies RgbValue;
};

type IntermediateValue = {
  type: "intermediate";
  value: string;
};

const isTransparent = (color: StyleValue) =>
  color.type === "keyword" && color.value === "transparent";

type IntermediateColorValue = {
  type: "intermediate";
  value: string;
};

const styleValueToRgb = (
  styleValue: StyleValue | IntermediateColorValue | undefined
): RgbValue | undefined => {
  if (styleValue === undefined) {
    return;
  }

  if (styleValue.type === "intermediate") {
    const parsed = colord(styleValue.value);
    if (parsed.isValid()) {
      return colordToRgbValue(parsed);
    }
    return;
  }

  if (styleValue.type === "rgb") {
    return styleValue;
  }

  if (styleValue.type === "keyword" || styleValue.type === "invalid") {
    const parsed = colord(styleValue.value);
    if (parsed.isValid()) {
      return colordToRgbValue(parsed);
    }
    return;
  }

  if (styleValue.type === "var") {
    // Variables are not supported for gradient stops editing.
    return;
  }

  const parsed = colord(toValue(styleValue));
  if (parsed.isValid()) {
    return colordToRgbValue(parsed);
  }
};

export const BackgroundGradient = ({ index }: { index: number }) => {
  const styleDecl = useComputedStyleDecl("background-image");
  let styleValue = styleDecl.cascadedValue;
  if (styleValue.type === "layers") {
    styleValue = styleValue.value[index];
  }

  const gradientString = useMemo(() => toValue(styleValue), [styleValue]);
  const parsedGradient = useMemo(
    () => parseLinearGradient(gradientString),
    [gradientString]
  );
  const initialGradient = useMemo(
    () => parsedGradient ?? defaultGradient,
    [parsedGradient]
  );
  const handleGradientSave = useCallback(
    (nextGradient: ParsedGradient) => {
      const gradientValue = reconstructLinearGradient(nextGradient);
      const style: StyleValue = { type: "unparsed", value: gradientValue };
      setRepeatedStyleItem(styleDecl, index, style);
    },
    [index, setRepeatedStyleItem, styleDecl]
  );

  const {
    value: gradient,
    set: setLocalGradient,
    save: saveLocalGradient,
  } = useLocalValue<ParsedGradient>(initialGradient, handleGradientSave, {
    autoSave: false,
  });
  const [selectedStopIndex, setSelectedStopIndex] = useState(0);

  const [intermediateValue, setIntermediateValue] = useState<
    IntermediateValue | InvalidValue | undefined
  >(undefined);

  useEffect(() => {
    if (gradient.stops.length === 0) {
      setSelectedStopIndex(0);
      return;
    }

    setSelectedStopIndex((currentIndex) => {
      if (currentIndex < 0) {
        return 0;
      }
      if (currentIndex >= gradient.stops.length) {
        return gradient.stops.length - 1;
      }
      return currentIndex;
    });
  }, [gradient]);

  const textAreaValue = intermediateValue?.value ?? toValue(styleValue);

  const previewGradient = useCallback(
    (nextGradient: ParsedGradient) => {
      setLocalGradient(nextGradient);
      const gradientValue = reconstructLinearGradient(nextGradient);
      const style: StyleValue = { type: "unparsed", value: gradientValue };
      setRepeatedStyleItem(styleDecl, index, style, { isEphemeral: true });
      setIntermediateValue(undefined);
    },
    [index, setLocalGradient, setRepeatedStyleItem, styleDecl]
  );

  const commitGradient = useCallback(
    (nextGradient: ParsedGradient) => {
      setLocalGradient(nextGradient);
      setIntermediateValue(undefined);
      saveLocalGradient();
    },
    [saveLocalGradient, setLocalGradient]
  );

  const handleStopColorChange = useCallback(
    (color: RgbValue, options?: { commit?: boolean }) => {
      const stops = gradient.stops.map((stop, index) =>
        index === selectedStopIndex ? { ...stop, color } : stop
      );
      const nextGradient = { ...gradient, stops };
      if (options?.commit) {
        commitGradient(nextGradient);
      } else {
        previewGradient(nextGradient);
      }
    },
    [commitGradient, gradient, previewGradient, selectedStopIndex]
  );

  const selectedStop = gradient.stops[selectedStopIndex];

  const applyStyleValueToStop = useCallback(
    (
      styleValue: StyleValue | IntermediateColorValue | undefined,
      options?: { commit?: boolean }
    ) => {
      const rgb = styleValueToRgb(styleValue);
      if (rgb) {
        handleStopColorChange(rgb, options);
      }
    },
    [handleStopColorChange]
  );

  const handleColorPickerChange = useCallback(
    (styleValue: StyleValue | IntermediateColorValue | undefined) => {
      applyStyleValueToStop(styleValue);
    },
    [applyStyleValueToStop]
  );

  const handleColorPickerChangeComplete = useCallback(
    (styleValue: StyleValue) => {
      applyStyleValueToStop(styleValue, { commit: true });
    },
    [applyStyleValueToStop]
  );

  const handleChange = (value: string) => {
    setIntermediateValue({
      type: "intermediate",
      value,
    });

    // This doesn't have the same behavior as CssValueInput.
    // However, it's great to see the immediate results when making gradient changes,
    // especially until we have a better gradient tool.
    const newValue = parseCssValue("background-image", value);

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
      <Flex direction="column" gap="3">
        <Box css={{ paddingInline: theme.spacing[2] }}>
          <GradientPicker
            gradient={gradient}
            onChange={previewGradient}
            onChangeComplete={commitGradient}
            onThumbSelect={(index) => {
              setSelectedStopIndex(index);
            }}
          />
        </Box>
        {selectedStop?.color ? (
          <Flex direction="column" gap="2">
            <Label>Color</Label>
            <ColorPicker
              property="color"
              value={selectedStop.color}
              currentColor={selectedStop.color}
              onChange={handleColorPickerChange}
              onChangeComplete={handleColorPickerChangeComplete}
              onAbort={() => {
                // no-op: gradient changes are managed via GradientPicker callbacks
              }}
              onReset={() => {
                // no-op: gradient changes are managed via GradientPicker callbacks
              }}
            />
          </Flex>
        ) : (
          <Text color="subtle">Select a gradient stop to edit its color.</Text>
        )}
      </Flex>
      {parsedGradient === undefined && (
        <Text color="subtle">
          The current value isn't a linear gradient. Adjusting the controls will
          create a new linear gradient.
        </Text>
      )}
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
