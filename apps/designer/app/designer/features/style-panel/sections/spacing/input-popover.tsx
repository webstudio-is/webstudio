import { useState } from "react";
import {
  keyframes,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverPortal,
  styled,
} from "@webstudio-is/design-system";
import {
  CssValueInput,
  type IntermediateStyleValue,
} from "../../shared/css-value-input";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-data";
import type { StyleChangeEvent } from "./types";

const slideUpAndFade = keyframes({
  "0%": { opacity: 0, transform: "scale(0)" },
  "100%": { opacity: 1, transform: "scale(1)" },
});

const Input = ({
  value,
  property,
  onChange,
  onBlur,
}: {
  property: StyleProperty;
  value: StyleValue;
  onChange: (event: StyleChangeEvent) => void;
  onBlur: () => void;
}) => {
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  // @todo: ability to set to "auto" via unit picker
  return (
    <CssValueInput
      property={property}
      value={value}
      intermediateValue={intermediateValue}
      onBlur={onBlur}
      onChange={(styleValue) => {
        setIntermediateValue(styleValue);
        if (styleValue.type !== "intermediate") {
          onChange({ property, value: styleValue, isEphemeral: true });
        }
      }}
      onHighlight={(styleValue) => {
        onChange({ property, value: styleValue, isEphemeral: true });
      }}
      onChangeComplete={(styleValue) => {
        setIntermediateValue(undefined);
        onChange({ property, value: styleValue, isEphemeral: false });
      }}
    />
  );
};

// trigger is used only for positioning
const Trigger = styled("div", { position: "absolute", width: 0, height: 0 });

const PopoverContentStyled = styled(PopoverContent, {
  minWidth: 0,
  minHeight: 0,
  width: 88,
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
  value,
  property,
  onChange,
  isOpen,
  onClose,
}: {
  property: StyleProperty;
  value: StyleValue;
  onChange: (event: StyleChangeEvent) => void;
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
          {/* @todo: close popover on Enter */}
          <Input
            value={value}
            property={property}
            onChange={onChange}
            // when modal=false, close on click-outside doesn't work reliably,
            // so we close on blur as well to be sure
            onBlur={onClose}
          />
        </PopoverContentStyled>
      </PopoverPortal>
    </Popover>
  );
};
