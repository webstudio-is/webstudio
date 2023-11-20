/**
 * Implementation of the autogrowing text input for the AI
 * https://www.figma.com/file/xCBegXEWxROLqA1Y31z2Xo/%F0%9F%93%96-Webstudio-Design-Docs?node-id=7586%3A48784&mode=dev
 */

import { type ComponentProps, type Ref, forwardRef } from "react";
import { type CSS, css, theme } from "../../stitches.config";
import { textVariants } from "../text";
import { Grid } from "../grid";
import { useControllableState } from "@radix-ui/react-use-controllable-state";

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
    // @todo: Ask Taylor if we should use the same color as the placeholder
    opacity: 0.6,
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
};

export const AutogrowTextArea = forwardRef(
  (
    { css, className, state, value, defaultValue, onChange, ...props }: Props,
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
          onChange={(event) => setTextValue(event.target.value)}
          spellCheck={false}
          className={style({
            state,
            className,
          })}
          ref={ref}
          {...props}
        />
      </Grid>
    );
  }
);
AutogrowTextArea.displayName = "AutogrowTextArea";
