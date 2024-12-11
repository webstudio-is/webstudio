import { useState, type JSX, type ReactNode } from "react";
import { declarationDescriptions } from "@webstudio-is/css-data";
import { AlertIcon } from "@webstudio-is/icons";
import {
  Flex,
  rawTheme,
  ToggleGroup,
  ToggleGroupButton,
  Tooltip,
} from "@webstudio-is/design-system";
import {
  hyphenateProperty,
  toValue,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import { humanizeString } from "~/shared/string-utils";
import { useComputedStyles } from "../../shared/model";
import { createBatchUpdate } from "../../shared/use-style-data";
import {
  getPriorityStyleValueSource,
  PropertyInfo,
} from "../../property-label";

export const ToggleGroupTooltip = ({
  isOpen,
  onOpenChange,
  isSelected,
  label,
  code,
  description,
  properties,
  isAdvanced,
  children,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isSelected: boolean;
  label?: string;
  code?: string;
  description: string | undefined;
  properties: StyleProperty[];
  isAdvanced?: boolean;
  children: ReactNode;
}) => {
  const styles = useComputedStyles(properties);
  const resetProperty = () => {
    const batch = createBatchUpdate();
    for (const property of properties) {
      batch.deleteProperty(property);
    }
    batch.publish();
  };
  return (
    <Tooltip
      open={isOpen}
      onOpenChange={onOpenChange}
      // prevent closing tooltip on content click
      onPointerDown={(event) => event.preventDefault()}
      triggerProps={{
        onClick: (event) => {
          if (event.altKey) {
            event.preventDefault();
            resetProperty();
            return;
          }
        },
      }}
      content={
        <PropertyInfo
          title={label ?? humanizeString(properties[0])}
          code={code}
          description={
            <Flex gap="2" direction="column">
              {description}
              {isAdvanced && (
                <Flex gap="1">
                  <AlertIcon color={rawTheme.colors.backgroundAlertMain} /> This
                  value was defined in the Advanced section.
                </Flex>
              )}
            </Flex>
          }
          styles={isSelected ? styles : []}
          onReset={() => {
            resetProperty();
            onOpenChange(false);
          }}
        />
      }
    >
      {children}
    </Tooltip>
  );
};

export const ToggleGroupControl = ({
  label,
  properties,
  items,
}: {
  label?: string;
  properties: [StyleProperty, ...StyleProperty[]];
  items: Array<{
    child: JSX.Element;
    value: string;
    description?: string;
  }>;
}) => {
  const styles = useComputedStyles(properties);
  const styleValueSource = getPriorityStyleValueSource(styles);
  const selectedValue = toValue(styles[0].cascadedValue);
  const values = styles.map((styleDecl) => toValue(styleDecl.cascadedValue));
  const isAdvanced =
    // show value as advanced when value is not represent with buttons
    items.some((item) => values.includes(item.value)) === false ||
    // show value as advanced when longhands use inconsistent values
    new Set(values).size > 1;
  // Issue: The tooltip's grace area is too big and overlaps with nearby buttons,
  // preventing the tooltip from changing when the buttons are hovered over in certain cases.
  // To solve issue and allow tooltips to change on button hover,
  // we close the button tooltip in the ToggleGroupButton.onMouseEnter handler.
  // onMouseEnter used to preserve default hovering behavior on tooltip.
  const [activeTooltip, setActiveTooltip] = useState<undefined | string>();
  return (
    <ToggleGroup
      color={styleValueSource}
      type="single"
      // trigger value change when value is advanced
      // and need to change all at once
      value={isAdvanced ? "" : selectedValue}
      onValueChange={(value) => {
        const batch = createBatchUpdate();
        for (const property of properties) {
          batch.setProperty(property)({ type: "keyword", value });
        }
        batch.publish();
      }}
    >
      {items.map((item) => (
        <ToggleGroupTooltip
          key={item.value}
          isOpen={item.value === activeTooltip}
          onOpenChange={(isOpen) =>
            setActiveTooltip(isOpen ? item.value : undefined)
          }
          isSelected={item.value === selectedValue}
          isAdvanced={isAdvanced}
          label={label}
          code={properties
            .map((property) => `${hyphenateProperty(property)}: ${item.value};`)
            .join("\n")}
          description={
            item.description ??
            declarationDescriptions[
              `${properties[0]}:${item.value}` as keyof typeof declarationDescriptions
            ]
          }
          properties={properties}
        >
          <ToggleGroupButton
            aria-disabled={isAdvanced}
            value={item.value}
            onMouseEnter={() =>
              // reset only when highlighted is not active
              setActiveTooltip((prevValue) =>
                prevValue === item.value ? prevValue : undefined
              )
            }
          >
            {item.child}
          </ToggleGroupButton>
        </ToggleGroupTooltip>
      ))}
    </ToggleGroup>
  );
};
