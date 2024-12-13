import { useState } from "react";
import {
  keyframes,
  styled,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@webstudio-is/design-system";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";
import {
  CssValueInput,
  type IntermediateStyleValue,
} from "../../shared/css-value-input";
import { createBatchUpdate } from "../../shared/use-style-data";
import { theme } from "@webstudio-is/design-system";
import type { StyleValueSourceColor } from "~/shared/style-object-model";
import { $availableUnitVariables } from "../../shared/model";
import type { Modifiers } from "../../shared/modifier-keys";

const slideUpAndFade = keyframes({
  "0%": { opacity: 0, transform: "scale(0.8)" },
  "100%": { opacity: 1, transform: "scale(1)" },
});

const Input = ({
  styleSource,
  value,
  property,
  getActiveProperties,
  onClosePopover,
}: {
  styleSource: StyleValueSourceColor;
  property: StyleProperty;
  getActiveProperties: (modifiers?: Modifiers) => readonly StyleProperty[];
  value: StyleValue;
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
      getOptions={() => $availableUnitVariables.get()}
      onChange={(styleValue) => {
        setIntermediateValue(styleValue);
        const activeProperties = getActiveProperties();
        if (styleValue === undefined) {
          const batch = createBatchUpdate();
          for (const property of activeProperties) {
            batch.deleteProperty(property);
          }
          batch.publish({ isEphemeral: true });
          return;
        }
        if (styleValue.type !== "intermediate") {
          const batch = createBatchUpdate();
          for (const property of activeProperties) {
            batch.setProperty(property)(styleValue);
          }
          batch.publish({ isEphemeral: true });
        }
      }}
      onHighlight={(styleValue) => {
        if (styleValue === undefined) {
          const batch = createBatchUpdate();
          const activeProperties = getActiveProperties();
          for (const property of activeProperties) {
            batch.deleteProperty(property);
          }
          batch.publish({ isEphemeral: true });
          return;
        }
        const batch = createBatchUpdate();
        batch.setProperty(property)(styleValue);
        batch.publish({ isEphemeral: true });
      }}
      onChangeComplete={({ value, close = true, altKey, shiftKey }) => {
        const activeProperties = getActiveProperties({
          altKey,
          shiftKey,
          ctrlKey: false,
          metaKey: false,
        });

        setIntermediateValue(undefined);
        const batch = createBatchUpdate();
        for (const property of activeProperties) {
          batch.setProperty(property)(value);
        }
        batch.publish();
        if (close) {
          onClosePopover();
        }
      }}
      onAbort={() => {
        const batch = createBatchUpdate();
        batch.deleteProperty(property);
        batch.publish({ isEphemeral: true });
      }}
      onReset={() => {
        setIntermediateValue(undefined);
        const batch = createBatchUpdate();
        const activeProperties = getActiveProperties();
        for (const property of activeProperties) {
          batch.deleteProperty(property);
        }
        batch.publish();
        onClosePopover();
      }}
    />
  );
};

// trigger is used only for positioning
const Trigger = styled("div", { position: "absolute", width: 0, height: 0 });

const PopoverContentStyled = styled(PopoverContent, {
  minWidth: 0,
  minHeight: 0,
  width: theme.spacing[20],
  border: `1px solid ${theme.colors.borderMain}`,
  borderRadius: theme.borderRadius[7],
  background: theme.colors.backgroundPanel,
  padding: theme.spacing[5],
  boxShadow: theme.shadows.menuDropShadow,
  animationDuration: "200ms",
  animationTimingFunction: theme.easing.easeOut,
  '&[data-state="open"]': { animationName: slideUpAndFade },
});

export const InputPopover = ({
  styleSource,
  property,
  getActiveProperties,
  value,
  isOpen,
  onClose,
}: {
  styleSource: StyleValueSourceColor;
  property: StyleProperty;
  getActiveProperties: (modifiers?: Modifiers) => readonly StyleProperty[];
  value: StyleValue;
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
      <PopoverContentStyled
        sideOffset={-24}
        // prevent propagating click on input or combobox menu
        // and closing popover before applying changes
        onClick={(event) => event.stopPropagation()}
      >
        <Input
          styleSource={styleSource}
          value={value}
          property={property}
          getActiveProperties={getActiveProperties}
          onClosePopover={onClose}
        />
      </PopoverContentStyled>
    </Popover>
  );
};
