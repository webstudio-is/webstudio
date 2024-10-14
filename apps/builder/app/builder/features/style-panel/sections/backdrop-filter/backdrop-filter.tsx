import {
  toValue,
  type StyleProperty,
  type StyleValue,
} from "@webstudio-is/css-engine";
import { Tooltip, Flex, Text } from "@webstudio-is/design-system";
import { InfoCircleIcon } from "@webstudio-is/icons";
import { humanizeString } from "~/shared/string-utils";
import { RepeatedStyleSection } from "../../shared/style-section";
import { FilterSectionContent } from "../../shared/filter-content";
import { parseCssFragment } from "../../shared/css-fragment";
import {
  addRepeatedStyleItem,
  editRepeatedStyleItem,
  RepeatedStyle,
} from "../../shared/repeated-style";
import { useComputedStyleDecl } from "../../shared/model";

export const properties = ["backdropFilter"] satisfies [
  StyleProperty,
  ...StyleProperty[],
];

const property: StyleProperty = properties[0];
const label = "Backdrop Filters";
const initialBackdropFilter = "blur(0px)";

const getItemProps = (_index: number, value: StyleValue) => {
  const label =
    value.type === "function"
      ? `${humanizeString(value.name)}: ${toValue(value.args)}`
      : "Unknown filter";
  return { label };
};

export const Section = () => {
  const styleDecl = useComputedStyleDecl("backdropFilter");

  return (
    <RepeatedStyleSection
      label={label}
      description="Backdrop filters are similar to filters, but are applied to the area behind an element. This can be useful for creating frosted glass effects."
      properties={properties}
      onAdd={() => {
        addRepeatedStyleItem(
          [styleDecl],
          parseCssFragment(initialBackdropFilter, ["backdropFilter"])
        );
      }}
    >
      <RepeatedStyle
        label={label}
        styles={[styleDecl]}
        getItemProps={getItemProps}
        renderItemContent={(index, primaryValue) => (
          <FilterSectionContent
            index={index}
            property={property}
            propertyValue={toValue(primaryValue)}
            layer={primaryValue}
            onEditLayer={(index, value, options) => {
              editRepeatedStyleItem(
                [styleDecl],
                index,
                new Map([["backdropFilter", value]]),
                options
              );
            }}
            tooltip={
              <Tooltip
                variant="wrapped"
                content={
                  <Flex gap="2" direction="column">
                    <Text variant="regularBold">{label}</Text>
                    <Text variant="monoBold">backdrop-filter</Text>
                    <Text>
                      Applies graphical effects like blur or color shift to the
                      area behind an element
                      <br /> <br />
                      <Text variant="mono">{initialBackdropFilter}</Text>
                    </Text>
                  </Flex>
                }
              >
                <InfoCircleIcon />
              </Tooltip>
            }
          />
        )}
      />
    </RepeatedStyleSection>
  );
};
