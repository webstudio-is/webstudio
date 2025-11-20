import {
  forwardRef,
  type ComponentProps,
  type ElementRef,
  useEffect,
  useState,
} from "react";
import { colord, extend, type RgbaColor } from "colord";
import namesPlugin from "colord/plugins/names";
import { clamp } from "@react-aria/utils";
import { useDebouncedCallback } from "use-debounce";
import { RgbaColorPicker } from "react-colorful";
import { EyedropperIcon } from "@webstudio-is/icons";
import {
  toValue,
  type StyleValue,
  type Unit,
  type RgbValue,
} from "@webstudio-is/css-engine";
import { css, rawTheme, theme, type CSS } from "../stitches.config";
import { useDisableCanvasPointerEvents } from "../utilities";
import { Grid } from "./grid";
import { IconButton } from "./icon-button";
import { InputField } from "./input-field";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

extend([namesPlugin]);

const colorfulStyles = css({
  ".react-colorful__pointer": {
    width: theme.spacing[10],
    height: theme.spacing[10],
  },
});

const whiteColor: RgbaColor = { r: 255, g: 255, b: 255, a: 1 };
const borderColorSwatch = colord(rawTheme.colors.borderColorSwatch).toRgb();
const transparentColor: RgbaColor = { r: 0, g: 0, b: 0, a: 0 };

const distance = (a: RgbaColor, b: RgbaColor) =>
  Math.sqrt(
    Math.pow(a.r / 255 - b.r / 255, 2) +
      Math.pow(a.g / 255 - b.g / 255, 2) +
      Math.pow(a.b / 255 - b.b / 255, 2) +
      Math.pow(a.a - b.a, 2)
  );

const calcBorderColor = (color: RgbaColor) => {
  const distanceToStartDrawBorder = 0.15;
  const alpha = clamp(
    (distanceToStartDrawBorder - distance(whiteColor, color)) /
      distanceToStartDrawBorder,
    0,
    1
  );
  return colord(lerpColor(transparentColor, borderColorSwatch, alpha));
};

const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;

const lerpColor = (a: RgbaColor, b: RgbaColor, t: number) => ({
  r: lerp(a.r, b.r, t),
  g: lerp(a.g, b.g, t),
  b: lerp(a.b, b.b, t),
  a: lerp(a.a, b.a, t),
});

const thumbStyle = css({
  display: "block",
  width: theme.spacing[9],
  height: theme.spacing[9],
  backgroundBlendMode: "difference",
  borderRadius: theme.borderRadius[2],
  borderWidth: 0,
  borderStyle: "solid",
  "&:focus-visible": {
    outline: `1px solid ${theme.colors.borderFocus}`,
    outlineOffset: 1,
  },
});

export type ColorThumbProps = Omit<
  ComponentProps<"button" | "span">,
  "color"
> & {
  interactive?: boolean;
  color?: RgbaColor;
  css?: CSS;
};

export const ColorThumb = forwardRef<ElementRef<"button">, ColorThumbProps>(
  ({ interactive, color = transparentColor, css, ...rest }, ref) => {
    const background =
      color === undefined || color.a < 1
        ? `repeating-conic-gradient(rgba(0,0,0,0.22) 0% 25%, transparent 0% 50%) 0% 33.33% / 40% 40%, ${colord(
            color
          ).toRgbString()}`
        : colord(color).toRgbString();
    const borderColor = calcBorderColor(color);

    const Component = interactive ? "button" : "span";

    return (
      <Component
        style={{
          background,
          borderColor: borderColor.toRgbString(),
          borderWidth: borderColor.alpha() === 0 ? 0 : 1,
        }}
        className={thumbStyle({ css })}
        tabIndex={-1}
        {...rest}
        ref={ref}
      />
    );
  }
);

ColorThumb.displayName = "ColorThumb";

const colorResultToRgbValue = (rgb: RgbaColor): RgbValue => ({
  type: "rgb",
  r: rgb.r,
  g: rgb.g,
  b: rgb.b,
  alpha: rgb.a ?? 1,
});

const normalizeHex = (value: string) => {
  const trimmed = value.trim();
  const hex = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return hex;
};

export const styleValueToRgbaColor = (
  value: StyleValue | IntermediateColorValue
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

type IntermediateColorValue = {
  type: "intermediate";
  value: string;
  unit?: Unit;
};

type ColorPickerValue = StyleValue | IntermediateColorValue;

type ColorPickerProps = {
  value: ColorPickerValue;
  onChange: (value: StyleValue | undefined) => void;
  onChangeComplete: (value: StyleValue) => void;
};

type ColorPickerPopoverProps = {
  value: StyleValue;
  onChange: (value: StyleValue | undefined) => void;
  onChangeComplete: (value: StyleValue) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  thumb?: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
};

const fixColor = (value: ColorPickerValue, color: RgbaColor) => {
  if (value.type === "keyword" && value.value === "transparent") {
    return { ...color, a: 1 };
  }
  return color;
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

export const ColorPicker = ({
  value,
  onChange,
  onChangeComplete,
}: ColorPickerProps) => {
  const [hex, setHex] = useState(() =>
    colord(styleValueToRgbaColor(value)).toHex()
  );
  const normalizedHex = normalizeHex(hex);
  const handleCompleteDebounced = useDebouncedCallback(
    (newValue: RgbValue) => onChangeComplete(newValue),
    500
  );

  return (
    <>
      <RgbaColorPicker
        className={colorfulStyles.toString()}
        color={colord(normalizedHex).toRgb()}
        onChange={(newRgb) => {
          const fixedRgb = fixColor(value, newRgb);
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

export const ColorPickerPopover = ({
  value,
  onChange,
  onChangeComplete,
  open,
  onOpenChange,
  thumb,
  side = "bottom",
  align = "center",
  sideOffset,
}: ColorPickerPopoverProps) => {
  const [displayColorPicker, setDisplayColorPicker] = useState(false);
  const { enableCanvasPointerEvents, disableCanvasPointerEvents } =
    useDisableCanvasPointerEvents();

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : displayColorPicker;

  useEffect(() => {
    if (isOpen) {
      disableCanvasPointerEvents();
      document.body.style.userSelect = "none";
    } else {
      document.body.style.removeProperty("user-select");
      enableCanvasPointerEvents();
    }

    return () => {
      document.body.style.removeProperty("user-select");
      enableCanvasPointerEvents();
    };
  }, [isOpen, disableCanvasPointerEvents, enableCanvasPointerEvents]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setDisplayColorPicker(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <Popover modal open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        asChild
        aria-label="Open color picker"
        onClick={() => handleOpenChange(!isOpen)}
      >
        {thumb ?? (
          <ColorThumb color={styleValueToRgbaColor(value)} interactive={true} />
        )}
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        css={{
          display: "grid",
          padding: theme.spacing[5],
          gap: theme.spacing[5],
        }}
      >
        <ColorPicker
          value={value}
          onChange={onChange}
          onChangeComplete={onChangeComplete}
        />
      </PopoverContent>
    </Popover>
  );
};
