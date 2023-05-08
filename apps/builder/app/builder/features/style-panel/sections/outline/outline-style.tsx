import type { StyleProperty } from "@webstudio-is/css-data";
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
import type { RenderCategoryProps } from "../../style-sections";
import { toPascalCase } from "../../shared/keyword-utils";
import { PropertyName } from "../../shared/property-name";
import { toValue } from "@webstudio-is/css-engine";

const outlineStyleProperties = [
  "outlineStyle",
] as const satisfies readonly StyleProperty[];

const outlineStyleValues = [
  { value: "none", Icon: SmallXIcon },
  { value: "solid", Icon: DashBorderIcon },
  { value: "dashed", Icon: DashedBorderIcon },
  { value: "dotted", Icon: DottedBorderIcon },
];

export const OutlineStyle = (
  props: Pick<
    RenderCategoryProps,
    "currentStyle" | "setProperty" | "deleteProperty" | "createBatchUpdate"
  >
) => {
  const { currentStyle, setProperty, deleteProperty } = props;
  const outlineStyleValue = toValue(
    currentStyle["outlineStyle"]?.value ?? {
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
        property={outlineStyleProperties}
        style={props.currentStyle}
        label={"Style"}
        onReset={() => deleteProperty("outlineStyle")}
      />

      <ToggleGroup
        css={{
          gridColumn: `span 2`,
          justifySelf: "end",
        }}
        type="single"
        value={outlineStyleValue}
        onValueChange={(value) => setProperty("outlineStyle")(value)}
      >
        {outlineStyleValues.map(({ value, Icon }) => (
          <ToggleGroupItem key={value} value={value}>
            <Tooltip content={toPascalCase(value)}>
              <Icon />
            </Tooltip>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Grid>
  );
};
