import { type ComponentProps, useState } from "react";
import {
  keyframes,
  DeprecatedPopover,
  DeprecatedPopoverTrigger,
  DeprecatedPopoverContent,
  DeprecatedPopoverPortal,
  styled,
} from "@webstudio-is/design-system";
import type { StyleUpdate } from "@webstudio-is/project";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-data";
import {
  CssValueInput,
  type IntermediateStyleValue,
} from "../../shared/css-value-input";
import type { StyleSource } from "../../shared/style-info";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import { theme } from "@webstudio-is/design-system";

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

const PopoverContentStyled = styled(DeprecatedPopoverContent, {
  minWidth: 0,
  minHeight: 0,
  width: theme.spacing[20],
  border: `1px solid ${theme.colors.slate8}`,
  borderRadius: theme.borderRadius[7],
  background: theme.colors.gray2,
  padding: theme.spacing[5],
  boxShadow: theme.shadows.menuDropShadow,
  animationDuration: "200ms",
  animationTimingFunction: theme.easing.easeOut,
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
    <DeprecatedPopover
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (nextOpen === false) {
          onClose();
        }
      }}
    >
      <DeprecatedPopoverTrigger asChild>
        <Trigger />
      </DeprecatedPopoverTrigger>
      <DeprecatedPopoverPortal>
        <PopoverContentStyled hideArrow sideOffset={-24}>
          <Input
            styleSource={styleSource}
            value={value}
            property={property}
            onChange={onChange}
            onClosePopover={onClose}
          />
        </PopoverContentStyled>
      </DeprecatedPopoverPortal>
    </DeprecatedPopover>
  );
};
