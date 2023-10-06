/**
 * Implementation of the autogrowing text input for the AI
 * https://www.figma.com/file/xCBegXEWxROLqA1Y31z2Xo/%F0%9F%93%96-Webstudio-Design-Docs?node-id=7586%3A48784&mode=dev
 */

import { type ComponentProps, type Ref, forwardRef } from "react";
import { type CSS, css, theme } from "../stitches.config";
import { textVariants } from "./text";
import { Grid } from "./grid";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { ScrollArea } from "./scroll-area";

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
});

const style = css(commonStyle, {
  outline: "none",
  resize: "none",
  "&::placeholder": {
    color: theme.colors.foregroundContrastSubtle,
  },
  "&:disabled": {
    color: theme.colors.foregroundDisabled,
    background: theme.colors.backgroundInputDisabled,
  },
  variants: {
    state: {
      invalid: {
        color: theme.colors.foregroundDestructive,
      },
    },
  },
});

type Props = Omit<
  ComponentProps<"textarea">,
  "value" | "defaultValue" | "onChange"
> & {
  css?: CSS;
  state?: "invalid";
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  maxHeight?: number;
};

export const AutogrowTextArea = forwardRef(
  (
    {
      css,
      className,
      state,
      value,
      maxHeight,
      defaultValue,
      onChange,
      ...props
    }: Props,
    ref: Ref<HTMLTextAreaElement>
  ) => {
    // use
    const [textValue, setTextValue] = useControllableState({
      prop: value,
      defaultProp: defaultValue,
      onChange,
    });

    return (
      <Grid>
        <ScrollArea css={{ maxHeight }}>
          <Grid>
            <div
              className={style({
                css: { visibility: "hidden", ...css },
                state,
                className,
              })}
            >
              {textValue}{" "}
            </div>
            <textarea
              rows={1}
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              spellCheck={false}
              className={style({
                state,
                className,
              })}
              ref={ref}
              {...props}
            />
          </Grid>
        </ScrollArea>
      </Grid>
    );
  }
);
AutogrowTextArea.displayName = "AutogrowTextArea";
