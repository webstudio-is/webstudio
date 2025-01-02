import { CheckMarkIcon } from "@webstudio-is/icons/svg";
import {
  type TemplateMeta,
  $,
  css,
  PlaceholderValue,
} from "@webstudio-is/template";
import { radix } from "./shared/proxy";
import {
  borderRadius,
  borderWidth,
  boxShadow,
  colors,
  height,
  opacity,
  spacing,
  width,
} from "./shared/theme";

export const meta: TemplateMeta = {
  category: "radix",
  description:
    "Use within a form to allow your users to toggle between checked and not checked. Group checkboxes by matching their “Name” properties. Unlike radios, any number of checkboxes in a group can be checked.",
  order: 101,
  template: (
    <radix.Label
      ws:label="Checkbox Field"
      ws:style={css`
        display: flex;
        gap: ${spacing[2]};
        align-items: center;
      `}
    >
      <radix.Checkbox
        // peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background
        // focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        // disabled:cursor-not-allowed disabled:opacity-50
        // data-[state=checked]:bg-primary
        // data-[state=checked]:text-primary-foreground",
        ws:style={css`
          height: ${height[4]};
          width: ${width[4]};
          flex-shrink: 0;
          border-radius: ${borderRadius.sm};
          border: ${borderWidth.DEFAULT} solid ${colors.primary};
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
            color: ${colors.primaryForeground};
          }
        `}
      >
        <radix.CheckboxIndicator
          // flex items-center justify-center text-current
          ws:style={css`
            display: flex;
            align-items: center;
            justify-content: center;
            color: currentColor;
          `}
        >
          <$.HtmlEmbed ws:label="Indicator Icon" code={CheckMarkIcon} />
        </radix.CheckboxIndicator>
      </radix.Checkbox>
      <$.Text ws:label="Checkbox Label" tag="span">
        {new PlaceholderValue("Checkbox")}
      </$.Text>
    </radix.Label>
  ),
};
