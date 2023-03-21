import { Box, Grid } from "@webstudio-is/design-system";
import { CssValueInputContainer } from "../../controls/position/css-value-input-container";
import { ToggleGroupControl } from "../../controls/toggle/toggle-control";
import { styleConfigByName } from "../../shared/configs";
import { PropertyName } from "../../shared/property-name";
import { getStyleSource } from "../../shared/style-info";
import type { RenderCategoryProps } from "../../style-sections";
import {
  DivIcon,
  BorderWidthIndividualIcon,
  BorderWidthTopIcon,
  BorderWidthRightIcon,
  BorderWidthBottomIcon,
  BorderWidthLeftIcon,
} from "@webstudio-is/icons";
import { toValue } from "@webstudio-is/css-engine";

import type { UnitValue } from "@webstudio-is/css-data";
import type { DeleteProperty, SetProperty } from "../../shared/use-style-data";
import { useState } from "react";

const { items: borderWidthItems } = styleConfigByName["borderTopWidth"];
const borderWidthKeywords = borderWidthItems.map((item) => ({
  type: "keyword" as const,
  value: item.name,
}));

const borderWidthOptions = {
  borderTopWidth: {
    icon: <BorderWidthTopIcon />,
  },
  borderRightWidth: {
    icon: <BorderWidthRightIcon />,
  },
  borderLeftWidth: {
    icon: <BorderWidthLeftIcon />,
  },
  borderBottomWidth: {
    icon: <BorderWidthBottomIcon />,
  },
} as const;

const borderWidthProperties = Object.keys(borderWidthOptions) as Array<
  keyof typeof borderWidthOptions
>;

const borderWidthDefault: UnitValue = {
  type: "unit",
  value: 0,
  unit: "number",
};

export const BorderWidth = ({
  currentStyle,
  setProperty,
  deleteProperty,
  createBatchUpdate,
}: Pick<
  RenderCategoryProps,
  "currentStyle" | "setProperty" | "deleteProperty" | "createBatchUpdate"
>) => {
  const allPropertyValuesAreEqual =
    new Set(
      borderWidthProperties.map(
        (property) =>
          toValue(currentStyle[property]?.value) ?? toValue(borderWidthDefault)
      )
    ).size === 1;

  const [editAllPropertiesMode, setEditAllPropertiesMode] = useState(
    () => allPropertyValuesAreEqual
  );

  const firstPropertyName = borderWidthProperties[0];
  const borderWidthStyleInfo = currentStyle[firstPropertyName];
  const borderWidthStyleSource = getStyleSource(borderWidthStyleInfo);

  const deleteAllProperties: DeleteProperty = (_propertyName, options) => {
    const batch = createBatchUpdate();
    for (const property of borderWidthProperties) {
      batch.deleteProperty(property);
    }
    batch.publish(options);
  };

  const setAllProperties: ReturnType<SetProperty> = (value, options) => {
    const batch = createBatchUpdate();
    for (const property of borderWidthProperties) {
      batch.setProperty(property)(value);
    }
    batch.publish(options);
  };

  return (
    <>
      <Grid css={{ gridTemplateColumns: "1fr 72px 52px" }} gap={2}>
        <PropertyName
          style={currentStyle}
          property={borderWidthProperties}
          label={"Width"}
          onReset={() => deleteAllProperties(firstPropertyName)}
        />

        <Box css={{ visibility: editAllPropertiesMode ? "visible" : "hidden" }}>
          <CssValueInputContainer
            label={"Width"}
            property={"borderTopWidth"}
            styleSource={borderWidthStyleSource}
            keywords={borderWidthKeywords}
            value={borderWidthStyleInfo?.value}
            setValue={setAllProperties}
            deleteProperty={deleteAllProperties}
          />
        </Box>

        <ToggleGroupControl
          styleSource={"default"}
          onValueChange={(value) => setEditAllPropertiesMode(value === "all")}
          value={editAllPropertiesMode ? "all" : "individual"}
          items={[
            {
              child: <DivIcon />,
              label: "All sides",
              value: "all",
            },
            {
              child: <BorderWidthIndividualIcon />,
              label: "Individual sides",
              value: "individual",
            },
          ]}
        />
      </Grid>
      {editAllPropertiesMode === false && (
        <Grid columns={2} gap={2}>
          {borderWidthProperties.map((property) => (
            <CssValueInputContainer
              icon={borderWidthOptions[property].icon}
              key={property}
              label={styleConfigByName[property].label ?? ""}
              property={property}
              styleSource={getStyleSource(currentStyle[property])}
              keywords={borderWidthKeywords}
              value={currentStyle[property]?.value ?? borderWidthDefault}
              setValue={setProperty(property)}
              deleteProperty={deleteProperty}
            />
          ))}
        </Grid>
      )}
    </>
  );
};
