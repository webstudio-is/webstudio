import {
  Box,
  Grid,
  NestedIconLabel,
  ToggleButton,
} from "@webstudio-is/design-system";
import { CssValueInputContainer } from "../../controls/position/css-value-input-container";
import { styleConfigByName } from "../../shared/configs";
import { PropertyName } from "../../shared/property-name";
import { getStyleSource } from "../../shared/style-info";
import type { RenderCategoryProps } from "../../style-sections";
import { toValue } from "@webstudio-is/css-engine";

import type { StyleProperty, UnitValue } from "@webstudio-is/css-data";
import type { DeleteProperty, SetProperty } from "../../shared/use-style-data";
import { type ReactNode, useState } from "react";

const borderPropertyStyleValueDefault: UnitValue = {
  type: "unit",
  value: 0,
  unit: "number",
};

export const BorderProperty = ({
  currentStyle,
  setProperty,
  deleteProperty,
  createBatchUpdate,
  individualModeIcon,
  borderPropertyOptions,
  label,
}: Pick<
  RenderCategoryProps,
  "currentStyle" | "setProperty" | "deleteProperty" | "createBatchUpdate"
> & {
  individualModeIcon?: ReactNode;
  borderPropertyOptions: Partial<{
    [property in StyleProperty]: { icon?: ReactNode };
  }>;
  label: string;
}) => {
  const borderProperties = Object.keys(borderPropertyOptions) as Array<
    keyof typeof borderPropertyOptions
  >;

  const allPropertyValuesAreEqual =
    new Set(
      borderProperties.map(
        (property) =>
          toValue(currentStyle[property]?.value) ??
          toValue(borderPropertyStyleValueDefault)
      )
    ).size === 1;

  const [showIndividualMode, setShowIndividualMode] = useState(
    () => !allPropertyValuesAreEqual && individualModeIcon !== undefined
  );

  const firstPropertyName = borderProperties[0];

  const { items: borderPropertyItems } = styleConfigByName[firstPropertyName];

  const borderWidthKeywords = borderPropertyItems.map((item) => ({
    type: "keyword" as const,
    value: item.name,
  }));

  /**
   * Find any property that has a value
   */
  const borderWidthStyleInfo = borderProperties
    .map((property) => currentStyle[property]?.value)
    .find((styleValue) => {
      if (styleValue === undefined) {
        return false;
      }

      return (
        (styleValue.type === "unit" && styleValue.value > 0) ||
        styleValue.type === "keyword"
      );
    });

  const borderWidthStyleSource = getStyleSource(
    ...borderProperties.map((property) => currentStyle[property])
  );

  const deleteAllProperties: DeleteProperty = (_propertyName, options) => {
    const batch = createBatchUpdate();
    for (const property of borderProperties) {
      batch.deleteProperty(property);
    }
    batch.publish(options);
  };

  const setAllProperties: ReturnType<SetProperty> = (value, options) => {
    const batch = createBatchUpdate();
    for (const property of borderProperties) {
      batch.setProperty(property)(value);
    }
    batch.publish(options);
  };

  return (
    <Grid gap={1}>
      <Grid
        css={{
          gridTemplateColumns: individualModeIcon
            ? "1fr 80px max-content"
            : "1fr 116px",
        }}
        gap={2}
      >
        <PropertyName
          style={currentStyle}
          property={borderProperties}
          label={label}
          onReset={() => deleteAllProperties(firstPropertyName)}
        />

        <Box css={{ visibility: showIndividualMode ? "hidden" : "visible" }}>
          <CssValueInputContainer
            label={label}
            property={firstPropertyName}
            styleSource={borderWidthStyleSource}
            keywords={borderWidthKeywords}
            value={borderWidthStyleInfo}
            setValue={setAllProperties}
            deleteProperty={deleteAllProperties}
          />
        </Box>

        {individualModeIcon && (
          <ToggleButton
            pressed={showIndividualMode}
            onPressedChange={setShowIndividualMode}
          >
            {individualModeIcon}
          </ToggleButton>
        )}
      </Grid>
      {showIndividualMode && (
        <Grid columns={2} gap={1}>
          {borderProperties.map((property) => (
            <CssValueInputContainer
              icon={
                <NestedIconLabel>
                  {borderPropertyOptions[property]?.icon}
                </NestedIconLabel>
              }
              key={property}
              label={styleConfigByName[property].label ?? ""}
              property={property}
              styleSource={getStyleSource(currentStyle[property])}
              keywords={borderWidthKeywords}
              value={
                currentStyle[property]?.value ?? borderPropertyStyleValueDefault
              }
              setValue={setProperty(property)}
              deleteProperty={deleteProperty}
            />
          ))}
        </Grid>
      )}
    </Grid>
  );
};
