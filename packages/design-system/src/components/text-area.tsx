/**
 * Implementation of the "Text Area" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4-3389
 */

import { type ComponentProps, type Ref, forwardRef } from "react";
import { type CSS, css, theme } from "../stitches.config";
import { textVariants } from "./text";
import { Grid } from "./grid";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { ScrollArea } from "./scroll-area";

const LINE_HEIGHT = 16;
const PADDING_TOP = 6;
const PADDING_BOTTOM = 4;
const BORDER = 1;

const gridStyle = css(textVariants.regular, {
  color: theme.colors.foregroundMain,
  borderRadius: theme.borderRadius[4],
  border: `${BORDER}px solid ${theme.colors.borderMain}`,
  background: theme.colors.backgroundControls,
  paddingRight: theme.spacing[4],
  paddingLeft: theme.spacing[3],
  paddingTop: PADDING_TOP,
  paddingBottom: PADDING_BOTTOM,
  boxSizing: "border-box",
  resize: "vertical",
  overflow: "auto",
  width: "100%",

  "&:disabled": {
    color: theme.colors.foregroundDisabled,
    background: theme.colors.backgroundInputDisabled,
  },
  "&:focus-within": {
    borderColor: theme.colors.borderFocus,
    outline: `1px solid ${theme.colors.borderFocus}`,
  },
  variants: {
    state: {
      invalid: {
        color: theme.colors.foregroundDestructive,
        "&:not(:disabled):not(:focus-visible)": {
          borderColor: theme.colors.borderDestructiveMain,
        },
      },
    },
  },
});

const commonStyle = css(textVariants.regular, {
  border: "none",
  paddingRight: 0,
  paddingLeft: 0,
  paddingTop: 0,
  paddingBottom: 0,
  boxSizing: "border-box",
  gridArea: "1 / 1 / 2 / 2",
  background: "transparent",
  color: "inherit",
  textWrap: "wrap",
  overflowWrap: "break-word",
  whiteSpace: "pre-wrap",
  overflow: "hidden",
  resize: "none",
  outline: "none",
  "&::placeholder": {
    color: theme.colors.foregroundContrastSubtle,
  },
});

const textAreaStyle = css(commonStyle, {});

type Props = Omit<
  ComponentProps<"textarea">,
  "value" | "defaultValue" | "onChange"
> & {
  css?: CSS;
  rows?: number;
  state?: "invalid";
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
};

export const TextArea = forwardRef(
  (
    { css, className, rows = 3, state, value, onChange, ...props }: Props,
    ref: Ref<HTMLTextAreaElement>
  ) => {
    const [textValue, setTextValue] = useControllableState({
      prop: value,
      defaultProp: props.defaultValue,
      onChange,
    });
    // We could use `box-sizing:content-box` to avoid dealing with paddings and border here
    // But then, the user of the component will not be able to set `width` reliably
    const height =
      rows * LINE_HEIGHT + PADDING_TOP + PADDING_BOTTOM + BORDER * 2;

    const commonHeight = {
      height: "max-content",
    };

    const ScrollAreaIfNeeded = ScrollArea;

    const scrollThumpPositionDelta = 4;
    const textAreaScrollThumbMargin = scrollThumpPositionDelta + 2;

    return (
      <Grid
        className={gridStyle({
          state,
          css: { height, minHeight: height },
        })}
        onClick={(event) => {
          if (event.target instanceof HTMLElement) {
            // Focus textarea on click since it can't match parent height.
            const textarea = event.target.querySelector("textarea");
            if (textarea) {
              textarea.focus();
            }
          }
        }}
      >
        <ScrollAreaIfNeeded
          css={{
            // maxHeight: height,
            height: "100%",
            marginRight: -scrollThumpPositionDelta,
            "& > div": {},
            // Overwrite hack from scroll-area.tsx
            "& [data-radix-scroll-area-viewport] > div": {
              display: "grid!important",
            },
          }}
        >
          <div
            className={commonStyle({
              css: {
                marginRight: textAreaScrollThumbMargin,
                visibility: "hidden",
                ...commonHeight,
                ...css,
              },
              state,
              className,
            })}
          >
            {textValue}{" "}
          </div>

          <textarea
            spellCheck={false}
            className={textAreaStyle({
              css: { marginRight: textAreaScrollThumbMargin, ...css },
              state,
              className,
            })}
            onChange={(event) => setTextValue(event.target.value)}
            value={textValue}
            rows={rows}
            ref={ref}
            {...props}
          />
        </ScrollAreaIfNeeded>
      </Grid>
    );
  }
);
TextArea.displayName = "TextArea";
