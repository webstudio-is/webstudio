import { useState } from "react";
import { colord, extend, type RgbaColor } from "colord";
import namesPlugin from "colord/plugins/names";
import { useDebouncedCallback } from "use-debounce";
import { RgbaColorPicker } from "react-colorful";
import { EyedropperIcon } from "@webstudio-is/icons";
import type {
  StyleProperty,
  StyleValue,
  KeywordValue,
  RgbValue,
  VarValue,
} from "@webstudio-is/css-engine";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  useDisableCanvasPointerEvents,
  css,
  InputField,
  IconButton,
  Grid,
} from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import { theme } from "@webstudio-is/design-system";
import { CssValueInput } from "./css-value-input";
import type { IntermediateStyleValue } from "./css-value-input/css-value-input";
import { ColorThumb } from "./color-thumb";

// To support color names
extend([namesPlugin]);

const colorfulStyles = css({
  ".react-colorful__pointer": {
    width: theme.spacing[10],
    height: theme.spacing[10],
  },
});

const colorResultToRgbValue = (rgb: RgbaColor): RgbValue => {
  return {
    type: "rgb",
    r: rgb.r,
    g: rgb.g,
    b: rgb.b,
    alpha: rgb.a ?? 1,
  };
};

const styleValueToRgbaColor = (
  value: StyleValue | IntermediateStyleValue
): RgbaColor => {
  const color = colord(
    value.type === "intermediate" ? value.value : toValue(value)
  ).toRgb();

  return {
    r: color.r,
    g: color.g,
    b: color.b,
    a: color.a,
  };
};

const getEyeDropper = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Constructor = (window as any).EyeDropper;
  if (Constructor === undefined) {
    return;
  }
  const eyeDropper = new Constructor();
  return (callback: (rgb: string) => void) => {
    eyeDropper.open().then((result: { sRGBHex: string }) => {
      callback(result.sRGBHex);
    });
  };
};

const EyeDropper = ({ onChange }: { onChange: (rgb: string) => void }) => {
  const open = getEyeDropper();
  return (
    <IconButton
      disabled={open === undefined}
      onClick={() => {
        open?.(onChange);
      }}
    >
      <EyedropperIcon />
    </IconButton>
  );
};

const normalizeHex = (value: string) => {
  const trimmed = value.trim();
  const hex = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return hex;
};

/**
 * Keep content in separate component
 * to reset local state on outside changes
 * local state makes all changes less laggy
 */
const ColorPickerPopoverContent = ({
  value,
  onChange,
  onChangeComplete,
}: {
  value: StyleValue | IntermediateStyleValue;
  onChange: (value: StyleValue | undefined) => void;
  onChangeComplete: (value: StyleValue) => void;
}) => {
  const [hex, setHex] = useState(() =>
    colord(styleValueToRgbaColor(value)).toHex()
  );
  const normalizedHex = normalizeHex(hex);
  const handleCompleteDebounced = useDebouncedCallback(
    (newValue: RgbValue) => onChangeComplete(newValue),
    500
  );
  /**
   * By default, the color can be transparent, but if the user chooses a color from the picker,
   * we must set alpha = 1 otherwise all selected colors will be transparent.
   */
  const fixColor = (color: RgbaColor) => {
    if (value.type === "keyword" && value.value === "transparent") {
      color = { ...color, a: 1 };
    }
    return color;
  };
  return (
    <>
      <RgbaColorPicker
        className={colorfulStyles.toString()}
        color={colord(normalizedHex).toRgb()}
        onChange={(newRgb) => {
          const fixedRgb = fixColor(newRgb);
          setHex(colord(fixedRgb).toHex());
          const newValue = colorResultToRgbValue(fixedRgb);
          onChange(newValue);
          handleCompleteDebounced(newValue);
        }}
      />
      <Grid css={{ gridTemplateColumns: "auto 1fr" }} gap="1">
        <EyeDropper
          onChange={(newHex) => {
            setHex(newHex);
            const newValue = colorResultToRgbValue(colord(newHex).toRgb());
            onChangeComplete(newValue);
          }}
        />
        <InputField
          value={hex}
          onChange={(event) => {
            setHex(event.target.value);
            const color = colord(normalizeHex(event.target.value));
            if (color.isValid()) {
              const newValue = colorResultToRgbValue(color.toRgb());
              onChange(newValue);
              handleCompleteDebounced(newValue);
            }
          }}
        />
      </Grid>
    </>
  );
};

type ColorPickerProps = {
  onChange: (value: StyleValue) => void;
  onChangeComplete: (value: StyleValue) => void;
  onReset: () => void;
  onAbort: () => void;
  value: StyleValue;
  currentColor: StyleValue;
  getOptions?: () => Array<KeywordValue | VarValue>;
  property: StyleProperty;
  disabled?: boolean;
};

export const ColorPopover = ({
  value,
  onChange,
  onChangeComplete,
}: {
  value: StyleValue;
  onChange: (value: undefined | StyleValue) => void;
  onChangeComplete: (value: StyleValue) => void;
}) => {
  const [displayColorPicker, setDisplayColorPicker] = useState(false);
  const { enableCanvasPointerEvents, disableCanvasPointerEvents } =
    useDisableCanvasPointerEvents();

  const handleOpenChange = (open: boolean) => {
    setDisplayColorPicker(open);
    if (open) {
      // Dragging over canvas iframe with CORS policies will lead to loosing events and getting stuck in mousedown state.
      disableCanvasPointerEvents();
      // User may drag outside of the color picker and that will select everything.
      document.body.style.userSelect = "none";
      return;
    }

    document.body.style.removeProperty("user-select");
    enableCanvasPointerEvents();
  };

  return (
    <Popover modal open={displayColorPicker} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        asChild
        aria-label="Open color picker"
        onClick={() => setDisplayColorPicker((shown) => !shown)}
      >
        <ColorThumb
          color={styleValueToRgbaColor(value)}
          css={{ margin: theme.spacing[2] }}
          tabIndex={-1}
        />
      </PopoverTrigger>
      <PopoverContent
        css={{
          display: "grid",
          padding: theme.spacing[5],
          gap: theme.spacing[5],
        }}
      >
        <ColorPickerPopoverContent
          value={value}
          onChange={onChange}
          onChangeComplete={onChangeComplete}
        />
      </PopoverContent>
    </Popover>
  );
};

export const ColorPicker = ({
  value,
  currentColor,
  getOptions,
  property,
  disabled,
  onChange,
  onChangeComplete,
  onAbort,
  onReset,
}: ColorPickerProps) => {
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <CssValueInput
      aria-disabled={disabled}
      styleSource="default"
      prefix={
        <ColorPopover
          value={currentColor}
          onChange={(styleValue) => {
            setIntermediateValue(styleValue);
            if (styleValue) {
              onChange(styleValue);
            } else {
              onAbort();
            }
          }}
          onChangeComplete={(value) => {
            setIntermediateValue(undefined);
            onChangeComplete(value);
          }}
        />
      }
      showSuffix={false}
      property={property}
      value={value}
      intermediateValue={intermediateValue}
      getOptions={getOptions}
      onChange={(styleValue) => {
        if (styleValue === undefined) {
          setIntermediateValue(styleValue);
          onAbort();
          return;
        }
        if (styleValue.type === "intermediate") {
          setIntermediateValue(styleValue);
          return;
        }
        if (
          styleValue.type === "rgb" ||
          styleValue.type === "keyword" ||
          styleValue.type === "var" ||
          styleValue.type === "invalid"
        ) {
          setIntermediateValue(styleValue);
          onChange(styleValue);
          return;
        }

        setIntermediateValue({
          type: "intermediate",
          value: toValue(styleValue),
        });
      }}
      onHighlight={(styleValue) => {
        if (styleValue) {
          onChange(styleValue);
        } else {
          onAbort();
        }
      }}
      onChangeComplete={({ value }) => {
        if (
          value.type === "rgb" ||
          value.type === "keyword" ||
          value.type === "var"
        ) {
          setIntermediateValue(undefined);
          onChangeComplete(value);
          return;
        }
        // In case value is parsed to something wrong
        const invalidValue: StyleValue = {
          type: "invalid",
          value: toValue(value),
        };
        setIntermediateValue(invalidValue);
        onChange(invalidValue);
      }}
      onAbort={onAbort}
      onReset={() => {
        setIntermediateValue(undefined);
        onReset();
      }}
    />
  );
};
