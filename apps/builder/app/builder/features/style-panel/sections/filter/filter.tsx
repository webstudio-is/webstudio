import { Flex, Tooltip, Text } from "@webstudio-is/design-system";
import { InfoCircleIcon } from "@webstudio-is/icons";
import {
  toValue,
  type CssProperty,
  type StyleValue,
} from "@webstudio-is/css-engine";
import { RepeatedStyleSection } from "../../shared/style-section";
import { FilterSectionContent } from "../../shared/filter-content";
import {
  addRepeatedStyleItem,
  editRepeatedStyleItem,
  RepeatedStyle,
} from "../../shared/repeated-style";
import { parseCssFragment } from "../../shared/css-fragment";
import { useComputedStyleDecl } from "../../shared/model";
import { humanizeString } from "~/shared/string-utils";

export const properties = ["filter"] satisfies [CssProperty, ...CssProperty[]];

const label = "Filters";
const initialFilter = "blur(0px)";

const getItemProps = (_index: number, value: StyleValue) => {
  const label =
    value.type === "function"
      ? `${humanizeString(value.name)}: ${toValue(value.args)}`
      : "Unknown filter";
  return { label };
};

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
          parseCssFragment(initialFilter, ["filter"])
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
              <Tooltip
                variant="wrapped"
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
