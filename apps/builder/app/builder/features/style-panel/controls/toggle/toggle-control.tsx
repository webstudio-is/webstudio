import {
  Flex,
  ToggleGroup,
  ToggleGroupButton,
} from "@webstudio-is/design-system";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { StyleSource } from "../../shared/style-info";
import { ValueTooltip } from "../../shared/value-tooltip";
import { useState, type ReactElement } from "react";

export type ToggleGroupControlProps = {
  styleSource?: StyleSource;
  value: string;
  items: {
    child: JSX.Element;
    title: string;
    description: string;
    value: string;
    propertyValues: string | string[];
  }[];
  onValueChange?: (value: string) => void;
  onReset: () => void;
};

const ToggleGroupButtonWithTooltip = ({
  title,
  propertyValues,
  description,
  children,
  value,
  onReset,
}: {
  title: string;
  value: string;
  propertyValues: string | string[];
  description: React.ReactNode;
  children: ReactElement;
  onReset: () => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <ValueTooltip
      open={open}
      onOpenChange={setOpen}
      title={title}
      propertyValues={propertyValues}
      description={description}
    >
      <ToggleGroupButton
        onMouseLeave={(event) => {
          // The tooltip's grace area is too big and overlaps with nearby buttons,
          // preventing the tooltip from changing when the buttons are hovered over in certain cases.
          // Close the tooltip on mouse leave to allow the tooltip to change on button hover.
          setOpen(false);
        }}
        value={value}
        onClick={(event) => {
          if (event.altKey) {
            onReset?.();
          }
        }}
      >
        <Flex>{children}</Flex>
      </ToggleGroupButton>
    </ValueTooltip>
  );
};

// @todo refactor this control to follow the standard interface we otherwise have for all controls
export const ToggleGroupControl = ({
  styleSource,
  value = "",
  items = [],
  onValueChange,
  onReset,
}: ToggleGroupControlProps) => {
  // Issue 1: The tooltip's grace area is too big and overlaps with nearby buttons,
  //  preventing the tooltip from changing when the buttons are hovered over in certain cases.
  // Issue 2: When using radix-ui, if the tooltip's open state is explicitly changed,
  // it starts opening all tooltips without any delay.
  // To solve issue 1 and allow tooltips to change on button hover,
  // we close the button tooltip in the ToggleGroupButton.onMouseLeave handler. However, this action causes issue 2.
  // To avoid issue 2, we use our own TooltipProvider for the ToggleGroup
  // and reset/rerender it in the ToggleGroup's onMouseLeave handler.
  // This effectively reinitializes its internal state.
  const [reset, setReset] = useState(0);

  return (
    <TooltipProvider key={reset}>
      <ToggleGroup
        color={styleSource}
        type="single"
        value={value}
        onValueChange={onValueChange}
        css={{ width: "fit-content" }}
        onMouseLeave={() => {
          setReset((reset) => reset + 1);
        }}
      >
        {items.map(
          ({ child, title, value, description, propertyValues }, index) => {
            return (
              <ToggleGroupButtonWithTooltip
                key={index}
                title={title}
                propertyValues={propertyValues}
                description={description}
                value={value}
                onReset={onReset}
              >
                {child}
              </ToggleGroupButtonWithTooltip>
            );
          }
        )}
      </ToggleGroup>
    </TooltipProvider>
  );
};
