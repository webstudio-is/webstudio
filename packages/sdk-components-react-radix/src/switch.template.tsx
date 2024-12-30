import { css, type TemplateMeta } from "@webstudio-is/template";
import { radix } from "./shared/proxy";
import {
  borderRadius,
  borderWidth,
  boxShadow,
  colors,
  height,
  opacity,
  transition,
  width,
} from "./shared/theme";

export const meta: TemplateMeta = {
  category: "radix",
  description:
    "A control that allows the user to toggle between checked and not checked.",
  order: 11,
  template: (
    <radix.Switch
      // peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors
      // focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
      // disabled:cursor-not-allowed disabled:opacity-50
      // data-[state=checked]:bg-primary
      // data-[state=unchecked]:bg-input
      ws:style={css`
        display: inline-flex;
        height: 24px;
        width: 44px;
        flex-shrink: 0;
        cursor: pointer;
        align-items: center;
        border-radius: ${borderRadius.full};
        border: ${borderWidth[2]} solid transparent;
        transition: ${transition.all};
        &:focus-visible {
          outline: none;
          box-shadow: ${boxShadow.ring};
        }
        &:disabled {
          cursor: not-allowed;
          opacity: ${opacity[50]};
        }
        &[data-state="checked"] {
          background-color: ${colors.primary};
        }
        &[data-state="unchecked"] {
          background-color: ${colors.input};
        }
      `}
    >
      <radix.SwitchThumb
        // pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform
        // data-[state=checked]:translate-x-5
        // data-[state=unchecked]:translate-x-0
        ws:style={css`
          pointer-events: none;
          display: block;
          height: ${height[5]};
          width: ${width[5]};
          border-radius: ${borderRadius.full};
          background-color: ${colors.background};
          box-shadow: ${boxShadow.lg};
          transition: ${transition.transform};
          &[data-state="checked"] {
            transform: translateX(20px);
          }
          &[data-state="unchecked"] {
            transform: translateX(0px);
          }
        `}
      />
    </radix.Switch>
  ),
};
