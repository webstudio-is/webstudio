import { Flex, InfoTooltip, Text } from "@webstudio-is/design-system";
import { toValue, type CssProperty } from "@webstudio-is/css-engine";
import { RepeatedStyleSection } from "../../shared/style-section";
import {
  FilterSectionContent,
  getFilterItemProps,
} from "../../shared/filter-content";
import {
  addRepeatedStyleItem,
  editRepeatedStyleItem,
  RepeatedStyle,
} from "../../shared/repeated-style";
import { parseCssFragment } from "../../shared/css-fragment";
import { useComputedStyleDecl } from "../../shared/model";

export const properties = ["filter"] satisfies [CssProperty, ...CssProperty[]];

const label = "Filters";
const initialFilter = "blur(0px)";

export const Section = () => {
  const styleDecl = useComputedStyleDecl("filter");

  return (
    <RepeatedStyleSection
      label={label}
      description="Filter effects allow you to apply graphical effects like blurring, color shifting, and more to elements."
      properties={properties}
      onAdd={() => {
        addRepeatedStyleItem(
          [styleDecl],
          parseCssFragment(initialFilter, ["filter"]).styles
        );
      }}
    >
      <RepeatedStyle
        label={label}
        styles={[styleDecl]}
        getItemProps={getFilterItemProps}
        renderItemContent={(index, primaryValue) => (
          <FilterSectionContent
            index={index}
            property="filter"
            propertyValue={toValue(primaryValue)}
            layer={primaryValue}
            onEditLayer={(index, value, options) => {
              editRepeatedStyleItem(
                [styleDecl],
                index,
                new Map([["filter", value]]),
                options
              );
            }}
            tooltip={
              <InfoTooltip
                label="About filters"
                content={
                  <Flex gap="2" direction="column">
                    <Text variant="regularBold">{label}</Text>
                    <Text variant="monoBold">filter</Text>
                    <Text>
                      Applies graphical effects like blur or color shift to an
                      element, for example:
                      <br /> <br />
                      <Text variant="mono">{initialFilter}</Text>
                    </Text>
                  </Flex>
                }
              />
            }
          />
        )}
      />
    </RepeatedStyleSection>
  );
};
