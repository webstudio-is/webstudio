import { type ComponentProps, useState } from "react";
import {
  keyframes,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverPortal,
  styled,
} from "@webstudio-is/design-system";
import { StyleUpdate } from "@webstudio-is/project";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-data";
import {
  CssValueInput,
  type IntermediateStyleValue,
} from "../../shared/css-value-input";
import type { StyleSource } from "../../shared/style-info";
import { StyleUpdateOptions } from "../../shared/use-style-data";

const slideUpAndFade = keyframes({
  "0%": { opacity: 0, transform: "scale(0.8)" },
  "100%": { opacity: 1, transform: "scale(1)" },
});

const Input = ({
  styleSource,
  value,
  property,
  onChange,
  onClosePopover,
}: {
  styleSource: StyleSource;
  property: StyleProperty;
  value: StyleValue;
  onChange: (update: StyleUpdate, options: StyleUpdateOptions) => void;
  onClosePopover: () => void;
}) => {
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <CssValueInput
      styleSource={styleSource}
      property={property}
      value={value}
      intermediateValue={intermediateValue}
      onChange={(styleValue) => {
        setIntermediateValue(styleValue);

        if (styleValue === undefined) {
          onChange({ operation: "delete", property }, { isEphemeral: true });
          return;
        }

        if (styleValue.type !== "intermediate") {
          onChange(
            { operation: "set", property, value: styleValue },
            { isEphemeral: true }
          );
        }
      }}
      onHighlight={(styleValue) => {
        if (styleValue === undefined) {
          onChange({ operation: "delete", property }, { isEphemeral: true });
          return;
        }

        onChange(
          { operation: "set", property, value: styleValue },
          { isEphemeral: true }
        );
      }}
      onChangeComplete={({ value, reason }) => {
        setIntermediateValue(undefined);
        onChange({ operation: "set", property, value }, { isEphemeral: false });

        if (reason === "blur" || reason === "enter") {
          onClosePopover();
        }
      }}
      onAbort={() => {
        onChange({ operation: "delete", property }, { isEphemeral: true });
      }}
    />
  );
};

// trigger is used only for positioning
const Trigger = styled("div", { position: "absolute", width: 0, height: 0 });

const PopoverContentStyled = styled(PopoverContent, {
  minWidth: 0,
  minHeight: 0,
  width: "$spacing$20",
  border: "1px solid $colors$slate8",
  borderRadius: "$borderRadius$7",
  background: "$colors$gray2",
  padding: "$spacing$5",
  boxShadow: "0px 2px 7px rgba(0, 0, 0, 0.1), 0px 5px 17px rgba(0, 0, 0, 0.15)",
  animationDuration: "200ms",
  animationTimingFunction: "$easing$easeOut",
  '&[data-state="open"]': { animationName: slideUpAndFade },
});

export const InputPopover = ({
  styleSource,
  property,
  value,
  onChange,
  isOpen,
  onClose,
}: {
  styleSource: StyleSource;
  property: StyleProperty;
  value: StyleValue;
  onChange: ComponentProps<typeof Input>["onChange"];
  isOpen: boolean;
  onClose: () => void;
}) => {
  return (
    <Popover
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (nextOpen === false) {
          onClose();
        }
      }}
    >
      <PopoverTrigger asChild>
        <Trigger />
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContentStyled hideArrow sideOffset={-24}>
          <Input
            styleSource={styleSource}
            value={value}
            property={property}
            onChange={onChange}
            onClosePopover={onClose}
          />
        </PopoverContentStyled>
      </PopoverPortal>
    </Popover>
  );
};
