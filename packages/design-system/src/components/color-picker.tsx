import "hdr-color-input";
import type { ChangeDetail, ColorInput, ColorSpace } from "hdr-color-input";
import {
  color,
  toColorSpace,
  toColorComponent,
  parseColor,
  colorDistance,
  lerpColor,
  serializeColor,
  transparentColor,
  whiteColor,
  toValue,
  type PlainColorObject,
  type StyleValue,
  type ColorValue,
} from "@webstudio-is/css-engine";
import {
  forwardRef,
  useCallback,
  type ComponentProps,
  type ElementRef,
  useEffect,
  useId,
  useRef,
} from "react";
import { clamp } from "@react-aria/utils";
import { css, rawTheme, theme, type CSS } from "../stitches.config";
import { useDisableCanvasPointerEvents } from "../utilities";
import { textStyle } from "./text";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace React.JSX {
    interface IntrinsicElements {
      "color-input": React.HTMLAttributes<HTMLElement> & {
        ref?: React.Ref<HTMLElement>;
        value?: string;
        colorspace?: string;
        theme?: "auto" | "light" | "dark";
        "no-alpha"?: boolean | string;
        class?: string;
      };
    }
  }
}

// ─── Color utilities ─────────────────────────────────────────────────────────

// Convert a CSS color string emitted by <color-input> into a StyleValue.
const cssStringToStyleValue = (
  cssString: string,
  colorspace: ColorSpace
): ColorValue => {
  // hdr-color-input uses a few CSS aliases that differ from our canonical ids.
  // "hex" is a UI-only format (not a real color space) that serializes as hex.
  const colorSpace: ColorValue["colorSpace"] =
    colorspace === "hex"
      ? "hex"
      : toColorSpace(color.ColorSpace.get(colorspace));
  // For hex, colorjs parses to sRGB coords under the "srgb" spaceId — we keep
  // those coords but override the colorSpace to "hex" so toValue() serializes
  // back to hex format. For other spaces, use coords as-is.
  const parsed = color.parse(cssString);
  const colorValue = colorSpace === "hex" ? color.to(parsed, "srgb") : parsed;
  return {
    type: "color",
    colorSpace,
    components: colorValue.coords.map(
      toColorComponent
    ) as ColorValue["components"],
    alpha: toColorComponent(colorValue.alpha),
  };
};

// ─── ColorThumb ──────────────────────────────────────────────────────────────

const borderColorSwatch = parseColor(rawTheme.colors.borderColorSwatch);

const calcBorderColor = (color: PlainColorObject) => {
  const distanceToStartDrawBorder = 0.15;
  const alpha = clamp(
    (distanceToStartDrawBorder - colorDistance(whiteColor, color)) /
      distanceToStartDrawBorder,
    0,
    1
  );
  return lerpColor(transparentColor, borderColorSwatch, alpha);
};

const thumbStyle = css({
  display: "block",
  position: "relative",
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

type ColorThumbProps = Omit<ComponentProps<"button" | "span">, "color"> & {
  interactive?: boolean;
  color?: string;
  css?: CSS;
};

export const ColorThumb = forwardRef<ElementRef<"button">, ColorThumbProps>(
  ({ interactive, color = "transparent", css, ...rest }, ref) => {
    const parsed = parseColor(color);
    const alpha = parsed.alpha ?? 1;
    const background =
      alpha < 1
        ? `repeating-conic-gradient(rgba(0,0,0,0.22) 0% 25%, transparent 0% 50%)
 0% 33.33% / 40% 40%, ${color}`
        : color;
    const borderColor = calcBorderColor(parsed);

    const Component = interactive ? "button" : "span";

    return (
      <Component
        style={{
          background,
          borderColor: serializeColor(borderColor),
          borderWidth: (borderColor.alpha ?? 1) === 0 ? 0 : 1,
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

type ColorPickerProps = {
  value: StyleValue;
  onChange: (value: StyleValue | undefined) => void;
  onChangeComplete: (value: StyleValue) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  css?: CSS;
  disabled?: boolean;
};

// Renders <color-input> with its built-in trigger chip, hiding the text input.
// The chip opens the panel natively via the Popover API.
// Our own ColorThumb is rendered on top (pointer-events: none) so that clicks
// pass through to the real chip underneath.
export const __testing__ = { cssStringToStyleValue };

export const ColorPicker = ({
  value,
  onChange,
  onChangeComplete,
  open,
  onOpenChange,
  css,
  disabled = false,
}: ColorPickerProps) => {
  const colorInputRef = useRef<ColorInput>(null);
  const scopeClass = useId().replace(/:/g, "");
  const { enableCanvasPointerEvents, disableCanvasPointerEvents } =
    useDisableCanvasPointerEvents();

  // Keep stable refs to callbacks so the event-wiring effect never needs to
  // re-run (and tear down / re-attach listeners) just because a prop changed.
  const callbacksRef = useRef({
    onChange,
    onChangeComplete,
    onOpenChange,
    disableCanvasPointerEvents,
    enableCanvasPointerEvents,
    value,
  });
  callbacksRef.current = {
    onChange,
    onChangeComplete,
    onOpenChange,
    disableCanvasPointerEvents,
    enableCanvasPointerEvents,
    value,
  };

  const colorString = toValue(value);

  const overrideContrast = useCallback(() => {
    const colorInputElement = colorInputRef.current;
    if (!colorInputElement) {
      return;
    }
    colorInputElement.style.setProperty("--contrast", "inherit");
    colorInputElement.shadowRoot
      ?.querySelector<HTMLElement>(".preview")
      ?.style.setProperty("--value", rawTheme.colors.backgroundPanel);
  }, []);

  // Sync externally-controlled open state into the web component.
  useEffect(() => {
    if (disabled) {
      try {
        colorInputRef.current?.close();
      } catch {}
      return;
    }
    if (open === undefined) {
      return;
    }
    // hdr-color-input is loaded lazily; wait for the element to be defined
    // before calling .show()/.close() so the methods are available.
    customElements.whenDefined("color-input").then(() => {
      try {
        if (open === true) {
          colorInputRef.current?.show();
        } else {
          colorInputRef.current?.close();
        }
      } catch {}
    });
  }, [disabled, open]);

  // Sync external value changes into the web component.
  useEffect(() => {
    const colorInputElement = colorInputRef.current;
    if (colorInputElement && colorInputElement.value !== colorString) {
      colorInputElement.value = colorString;
    }
    overrideContrast();
  }, [colorString, overrideContrast]);

  // Wire up change / open / close events.
  useEffect(() => {
    const colorInputElement = colorInputRef.current;
    if (!colorInputElement) {
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    let lastStyleValue: StyleValue = callbacksRef.current.value;

    colorInputElement.addEventListener(
      "change",
      (event: Event) => {
        if (disabled) {
          return;
        }
        const { value, colorspace } = (event as CustomEvent<ChangeDetail>)
          .detail;
        lastStyleValue = cssStringToStyleValue(value, colorspace);
        callbacksRef.current.onChange(lastStyleValue);
        overrideContrast();
      },
      { signal }
    );

    colorInputElement.addEventListener(
      "open",
      () => {
        if (disabled) {
          try {
            colorInputElement.close();
          } catch {}
          return;
        }
        // Set contrast immediately on open so the initial color is correct
        // before any change event fires (the component's own JS sets --contrast
        // based on raw color only, ignoring alpha).
        callbacksRef.current.disableCanvasPointerEvents();
        document.body.style.userSelect = "none";
        callbacksRef.current.onOpenChange?.(true);
        overrideContrast();
      },
      { signal }
    );

    colorInputElement.addEventListener(
      "close",
      () => {
        callbacksRef.current.enableCanvasPointerEvents();
        document.body.style.removeProperty("user-select");
        callbacksRef.current.onOpenChange?.(false);
        if (!disabled) {
          callbacksRef.current.onChangeComplete(lastStyleValue);
        }
      },
      { signal }
    );

    // The component's JS re-sets --contrast on each color change, ignoring alpha.
    // Re-apply our override whenever the window regains focus (e.g. after the
    // user switches away and back while the picker is open).
    window.addEventListener("focus", overrideContrast, { signal });

    return () => {
      controller.abort();
      callbacksRef.current.enableCanvasPointerEvents();
      document.body.style.removeProperty("user-select");
    };
  }, [disabled, overrideContrast]);

  const { className: textClass } = textStyle();

  return (
    <>
      <style>{`
        /* Stitches can't handle ::part, need to migrate a new styling approach */
        .${scopeClass}, 
        .${scopeClass}::part(trigger), 
        .${scopeClass}::part(chip) {
          position: absolute;
          inset: 0;
          opacity: 0;
          width: auto;
          height: auto;
        }
        .${scopeClass}::part(input) {
          display: none;
        }
        .${scopeClass}::part(controls) {
          /* Hack to fix as we can't reach into .control and change grid-template-columns */
          font-size: 16px;
        }
        .${scopeClass}::part(output) {
          font-size: inherit;
          height: 2em;
        }       
      `}</style>

      <ColorThumb color={colorString} css={css} aria-disabled={disabled}>
        {disabled === false && (
          <color-input
            ref={colorInputRef}
            value={colorString}
            theme="light"
            class={`${textClass} ${scopeClass}`}
          />
        )}
      </ColorThumb>
    </>
  );
};
