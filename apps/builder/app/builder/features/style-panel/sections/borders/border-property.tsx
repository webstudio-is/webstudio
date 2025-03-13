import { type ReactNode } from "react";
import type { CssProperty } from "@webstudio-is/css-engine";
import { toValue } from "@webstudio-is/css-engine";
import { Box, Grid, ToggleButton } from "@webstudio-is/design-system";
import { keywordValues } from "@webstudio-is/css-data";
import { CssValueInputContainer } from "../../shared/css-value-input";
import { rowCss } from "./utils";
import { useSelectedInstanceKv } from "../../shared/instances-kv";
import {
  getPriorityStyleValueSource,
  PropertyLabel,
} from "../../property-label";
import {
  createBatchUpdate,
  deleteProperty,
  setProperty,
} from "../../shared/use-style-data";
import { $availableUnitVariables, useComputedStyles } from "../../shared/model";

export const BorderProperty = ({
  individualModeIcon,
  borderPropertyOptions,
  label,
  description,
}: {
  individualModeIcon?: ReactNode;
  borderPropertyOptions: Partial<{
    [property in CssProperty]: { icon?: ReactNode };
  }>;
  label: string;
  description: string;
}) => {
  const borderProperties = Object.keys(borderPropertyOptions) as [
    CssProperty,
    ...CssProperty[],
  ];
  const styles = useComputedStyles(borderProperties);
  const styleValueSourceColor = getPriorityStyleValueSource(styles);
  const allPropertyValuesAreEqual =
    new Set(styles.map((styleDecl) => toValue(styleDecl.cascadedValue)))
      .size === 1;

  /**
   * We do not use shorthand properties such as borderWidth or borderRadius in our code.
   * However, in the UI, we can display a single field, and in that case, we can use any property
   * from the shorthand property set and pass it instead.
   **/
  const firstPropertyName = borderProperties[0];

  const [showIndividualMode, setShowIndividualMode] = useSelectedInstanceKv(
    `${firstPropertyName}-showIndividualMode`,
    allPropertyValuesAreEqual === false && individualModeIcon !== undefined
  );

  /**
   * If the property is displayed in a non-individual mode, we need to provide a value for it.
   * In Webflow, an empty value is shown. In Figma, the "Mixed" keyword is shown.
   * We have decided to show the first defined value, as it is difficult to determine a maximum value
   * when there are keywords (such as "thin" or "thick") and different units involved.
   **/
  const value = styles[0].cascadedValue;

  return (
    <Grid gap={1}>
      <Grid css={rowCss}>
        <PropertyLabel
          label={label}
          description={description}
          properties={borderProperties}
        />

        <Box
          css={{
            visibility: showIndividualMode ? "hidden" : "visible",
            gridColumn: individualModeIcon ? `span 1` : `span 2`,
          }}
        >
          <CssValueInputContainer
            property={firstPropertyName}
            styleSource={styleValueSourceColor}
            getOptions={() => [
              ...(keywordValues[firstPropertyName] ?? []).map((value) => ({
                type: "keyword" as const,
                value,
              })),
              ...$availableUnitVariables.get(),
            ]}
            value={value}
            setValue={(newValue, options) => {
              const batch = createBatchUpdate();
              for (const property of borderProperties) {
                batch.setProperty(property)(newValue);
              }
              batch.publish(options);
            }}
            deleteProperty={(_property, options) => {
              const batch = createBatchUpdate();
              for (const property of borderProperties) {
                batch.deleteProperty(property);
              }
              batch.publish(options);
            }}
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
          {styles.map((styleDecl) => (
            <CssValueInputContainer
              key={styleDecl.property}
              icon={borderPropertyOptions[styleDecl.property]?.icon}
              property={styleDecl.property}
              styleSource={styleDecl.source.name}
              getOptions={() =>
                (keywordValues[firstPropertyName] ?? []).map((value) => ({
                  type: "keyword" as const,
                  value,
                }))
              }
              value={styleDecl.cascadedValue}
              setValue={setProperty(styleDecl.property)}
              deleteProperty={deleteProperty}
            />
          ))}
        </Grid>
      )}
    </Grid>
  );
};
