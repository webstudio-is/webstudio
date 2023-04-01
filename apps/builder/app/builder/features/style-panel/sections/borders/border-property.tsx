import {
  Box,
  Grid,
  NestedIconLabel,
  ToggleButton,
  theme,
} from "@webstudio-is/design-system";
import { CssValueInputContainer } from "../../controls/position/css-value-input-container";
import { styleConfigByName } from "../../shared/configs";
import { PropertyName } from "../../shared/property-name";
import { getStyleSource } from "../../shared/style-info";
import type { RenderCategoryProps } from "../../style-sections";
import { toValue } from "@webstudio-is/css-engine";
import { deleteAllProperties, setAllProperties } from "./border-utils";
import type { StyleProperty, UnitValue } from "@webstudio-is/css-data";
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

  // If individualModeIcon is not defined, we do not want to display individual properties at all.
  const [showIndividualMode, setShowIndividualMode] = useState(
    () =>
      allPropertyValuesAreEqual === false && individualModeIcon !== undefined
  );

  /**
   * We do not use shorthand properties such as borderWidth or borderRadius in our code.
   * However, in the UI, we can display a single field, and in that case, we can use any property
   * from the shorthand property set and pass it instead.
   **/
  const firstPropertyName = borderProperties[0];

  const { items: borderPropertyItems } = styleConfigByName(firstPropertyName);

  const borderWidthKeywords = borderPropertyItems.map((item) => ({
    type: "keyword" as const,
    value: item.name,
  }));

  /**
   * If the property is displayed in a non-individual mode, we need to provide a value for it.
   * In Webflow, an empty value is shown. In Figma, the "Mixed" keyword is shown.
   * We have decided to show the first defined value, as it is difficult to determine a maximum value
   * when there are keywords (such as "thin" or "thick") and different units involved.
   **/
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

  const deleteBorderProperties = deleteAllProperties(
    borderProperties,
    createBatchUpdate
  );

  const setBorderProperties = setAllProperties(
    borderProperties,
    createBatchUpdate
  )(firstPropertyName);

  return (
    <Grid gap={1}>
      <Grid
        css={{
          gridTemplateColumns: `1fr ${theme.spacing[20]} ${theme.spacing[12]}`,
        }}
        gap={2}
      >
        <PropertyName
          style={currentStyle}
          property={borderProperties}
          label={label}
          onReset={() => deleteBorderProperties(firstPropertyName)}
        />

        <Box
          css={{
            visibility: showIndividualMode ? "hidden" : "visible",
            gridColumn: individualModeIcon ? `span 1` : `span 2`,
          }}
        >
          <CssValueInputContainer
            label={label}
            property={firstPropertyName}
            styleSource={borderWidthStyleSource}
            keywords={borderWidthKeywords}
            value={borderWidthStyleInfo}
            setValue={setBorderProperties}
            deleteProperty={deleteBorderProperties}
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
              label={styleConfigByName(property).label ?? ""}
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
