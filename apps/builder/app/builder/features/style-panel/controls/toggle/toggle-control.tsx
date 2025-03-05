import { ToggleButton } from "@webstudio-is/design-system";
import {
  camelCaseProperty,
  declarationDescriptions,
} from "@webstudio-is/css-data";
import { toValue, type CssProperty } from "@webstudio-is/css-engine";
import type { IconComponent } from "@webstudio-is/icons";
import { humanizeString } from "~/shared/string-utils";
import { setProperty } from "../../shared/use-style-data";
import { useComputedStyleDecl } from "../../shared/model";
import { PropertyValueTooltip } from "../../property-label";

export const ToggleControl = ({
  property,
  items,
}: {
  property: CssProperty;
  items: Array<{
    name: string;
    label: string;
    icon: IconComponent;
  }>;
}) => {
  const computedStyleDecl = useComputedStyleDecl(property);
  const currentValue = toValue(computedStyleDecl.cascadedValue);
  const currentItem = items.find((item) => item.name === currentValue);
  const setValue = setProperty(property);

  // First item is the pressed state
  const isPressed = items[0].name === currentValue ? true : false;
  const Icon = currentItem?.icon ?? items[0].icon;
  // consider defined (not default) value as advanced
  // when there is no matching item
  const isAdvanced =
    computedStyleDecl.source.name !== "default" && currentItem === undefined;
  const description =
    declarationDescriptions[
      `${camelCaseProperty(property)}:${currentValue}` as keyof typeof declarationDescriptions
    ];

  return (
    <PropertyValueTooltip
      label={currentItem?.label ?? humanizeString(property)}
      description={description}
      properties={[property]}
      isAdvanced={isAdvanced}
    >
      <ToggleButton
        aria-disabled={isAdvanced}
        variant={computedStyleDecl.source.name}
        pressed={isPressed}
        onPressedChange={(isPressed) => {
          setValue({
            type: "keyword",
            value: isPressed ? items[0].name : items[1].name,
          });
        }}
        onPointerDown={(event) => {
          // tooltip reset property when click with altKey
          if (event.altKey) {
            event.preventDefault();
          }
        }}
      >
        <Icon />
      </ToggleButton>
    </PropertyValueTooltip>
  );
};
