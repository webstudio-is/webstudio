import {
  $,
  css,
  PlaceholderValue,
  type TemplateMeta,
} from "@webstudio-is/template";
import { DotIcon } from "@webstudio-is/icons/svg";
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

const createRadioGroupItem = ({
  value,
  label,
}: {
  value: string;
  label: string;
}) => (
  <radix.Label
    // flex items-center space-x-2
    ws:style={css`
      display: flex;
      align-items: center;
      gap: ${spacing[2]};
    `}
  >
    <radix.RadioGroupItem
      value={value}
      // aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background
      // focus:outline-none
      // focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
      // disabled:cursor-not-allowed disabled:opacity-50
      ws:style={css`
        aspect-ratio: 1 / 1;
        height: ${height[4]};
        width: ${width[4]};
        border-radius: ${borderRadius.full};
        border: ${borderWidth.DEFAULT} solid ${colors.primary};
        color: ${colors.primary};
        &:focus-visible {
          outline: none;
          box-shadow: ${boxShadow.ring};
        }
        &:disabled {
          cursor: not-allowed;
          opacity: ${opacity[50]};
        }
      `}
    >
      <radix.RadioGroupIndicator>
        <$.HtmlEmbed ws:label="Indicator Icon" code={DotIcon} />
      </radix.RadioGroupIndicator>
    </radix.RadioGroupItem>
    <$.Text>{new PlaceholderValue(label)}</$.Text>
  </radix.Label>
);

export const meta: TemplateMeta = {
  category: "radix",
  order: 100,
  description:
    "A set of checkable buttons—known as radio buttons—where no more than one of the buttons can be checked at a time.",
  template: (
    <radix.RadioGroup
      // grid gap-2
      ws:style={css`
        display: flex;
        flex-direction: column;
        gap: ${spacing[2]};
      `}
    >
      {createRadioGroupItem({ value: "default", label: "Default" })}
      {createRadioGroupItem({ value: "comfortable", label: "Comfortable" })}
      {createRadioGroupItem({ value: "compact", label: "Compact" })}
    </radix.RadioGroup>
  ),
};
