import { type ComponentProps, useState } from "react";
import {
  keyframes,
  styled,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@webstudio-is/design-system";
import type { StyleValue } from "@webstudio-is/css-engine";
import {
  CssValueInput,
  type IntermediateStyleValue,
} from "../../shared/css-value-input";
import type { StyleSource } from "../../shared/style-info";
import type {
  CreateBatchUpdate,
  StyleUpdate,
  StyleUpdateOptions,
} from "../../shared/use-style-data";
import { theme } from "@webstudio-is/design-system";
import { getInsetModifiersGroup, getSpaceModifiersGroup } from "./scrub";
import type { SpaceStyleProperty } from "../space/types";
import type { InsetProperty } from "../position/inset-layout";

const slideUpAndFade = keyframes({
  "0%": { opacity: 0, transform: "scale(0.8)" },
  "100%": { opacity: 1, transform: "scale(1)" },
});

// We need to differentiate between marginTop and top for example.
const isSpace = (property: string) => {
  return property.startsWith("margin") || property.startsWith("padding");
};

const Input = ({
  styleSource,
  value,
  property,
  onClosePopover,
  createBatchUpdate,
}: {
  styleSource: StyleSource;
  property: SpaceStyleProperty | InsetProperty;
  value: StyleValue;
  onClosePopover: () => void;
  createBatchUpdate: CreateBatchUpdate;
}) => {
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  const onChange = (
    updates: Array<StyleUpdate>,
    options: StyleUpdateOptions
  ) => {
    const batch = createBatchUpdate();
    for (const update of updates) {
      if (update.operation === "set") {
        batch.setProperty(update.property)(update.value);
      }
      if (update.operation === "delete") {
        batch.deleteProperty(update.property);
      }
    }
    batch.publish(options);
  };

  return (
    <CssValueInput
      styleSource={styleSource}
      property={property}
      value={value}
      intermediateValue={intermediateValue}
      onChange={(styleValue) => {
        setIntermediateValue(styleValue);

        if (styleValue === undefined) {
          onChange([{ operation: "delete", property }], { isEphemeral: true });
          return;
        }

        if (styleValue.type !== "intermediate") {
          onChange([{ operation: "set", property, value: styleValue }], {
            isEphemeral: true,
          });
        }
      }}
      onHighlight={(styleValue) => {
        if (styleValue === undefined) {
          onChange([{ operation: "delete", property }], { isEphemeral: true });
          return;
        }

        onChange([{ operation: "set", property, value: styleValue }], {
          isEphemeral: true,
        });
      }}
      onChangeComplete={({ value, type, altKey, shiftKey }) => {
        const updates: Array<StyleUpdate> = [];
        const options = { isEphemeral: false };
        const modifiers = { shiftKey, altKey };
        const properties = isSpace(property)
          ? getSpaceModifiersGroup(property as SpaceStyleProperty, modifiers)
          : getInsetModifiersGroup(property as InsetProperty, modifiers);

        setIntermediateValue(undefined);

        properties.forEach((property) => {
          updates.push({ operation: "set", property, value });
        });
        onChange(updates, options);

        if (type === "blur" || type === "enter") {
          onClosePopover();
        }
      }}
      onAbort={() => {
        onChange([{ operation: "delete", property }], { isEphemeral: true });
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
  isOpen,
  onClose,
  createBatchUpdate,
}: Pick<
  ComponentProps<typeof Input>,
  "styleSource" | "property" | "value" | "createBatchUpdate"
> & {
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
      <PopoverContentStyled hideArrow sideOffset={-24}>
        <Input
          styleSource={styleSource}
          value={value}
          property={property}
          createBatchUpdate={createBatchUpdate}
          onClosePopover={onClose}
        />
      </PopoverContentStyled>
    </Popover>
  );
};
