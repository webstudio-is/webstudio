import type { StyleProperty } from "@webstudio-is/css-data";
import { toValue } from "@webstudio-is/css-engine";
import {
  Grid,
  theme,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
} from "@webstudio-is/design-system";
import {
  DashBorderIcon,
  DashedBorderIcon,
  DottedBorderIcon,
  SmallXIcon,
} from "@webstudio-is/icons";
import { PropertyName } from "../../shared/property-name";
import type { RenderCategoryProps } from "../../style-sections";
import { deleteAllProperties, setAllProperties } from "./border-utils";

const borderStyleProperties = [
  "borderTopStyle",
  "borderRightStyle",
  "borderLeftStyle",
  "borderBottomStyle",
] as const satisfies readonly StyleProperty[];

const borderStyleValues = [
  { value: "none", icon: SmallXIcon },
  { value: "solid", icon: DashBorderIcon },
  { value: "dashed", icon: DashedBorderIcon },
  { value: "dotted", icon: DottedBorderIcon },
] as const;

export const BorderStyle = (
  props: Pick<
    RenderCategoryProps,
    "currentStyle" | "setProperty" | "deleteProperty" | "createBatchUpdate"
  >
) => {
  /**
   * We do not use shorthand properties such as borderWidth or borderRadius in our code.
   * However, in the UI, we can display a single field, and in that case, we can use any property
   * from the shorthand property set and pass it instead.
   **/
  const firstPropertyName = borderStyleProperties[0];

  const deleteBorderProperties = deleteAllProperties(
    borderStyleProperties,
    props.createBatchUpdate
  );

  const setBorderProperties = setAllProperties(
    borderStyleProperties,
    props.createBatchUpdate
  )(firstPropertyName);

  const firstPropertyValue = toValue(
    props.currentStyle[firstPropertyName]?.value ?? {
      type: "keyword",
      value: "none",
    }
  );

  return (
    <Grid
      css={{
        gridTemplateColumns: `1fr ${theme.spacing[20]} ${theme.spacing[12]}`,
      }}
      gap={2}
    >
      <PropertyName
        style={props.currentStyle}
        property={borderStyleProperties}
        label={"Style"}
        onReset={() => deleteBorderProperties(firstPropertyName)}
      />

      <ToggleGroup
        css={{
          gridColumn: `span 2`,
          justifySelf: "end",
        }}
        type="single"
        value={firstPropertyValue}
        onValueChange={(value) => {
          setBorderProperties({
            type: "keyword",
            value,
          });
        }}
      >
        {borderStyleValues.map(({ value, icon: Icon }) => (
          <ToggleGroupItem key={value} value={value}>
            <Tooltip content="URL">
              <Icon />
            </Tooltip>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Grid>
  );
};
