import { Grid, Label, Select, theme } from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import { TextControl } from "../../controls";
import { styleConfigByName } from "../../shared/configs";
import { toPascalCase } from "../../shared/keyword-utils";
import { parseCssValue } from "../../shared/parse-css-value";
import type { ControlProps } from "../../style-sections";

export const BackgroundSize = (
  props: Omit<ControlProps, "property" | "items">
) => {
  const property = "backgroundSize";
  const { items: defaultItems } = styleConfigByName[property];

  const selectOptions = [
    ...defaultItems,
    { name: "custom", label: "Custom" },
  ].map(({ name }) => name);

  const styleValue = props.currentStyle[property]?.value;

  const selectValue =
    styleValue?.type === "keyword" ? toValue(styleValue) : "custom";

  const sizeCustomDisabled = styleValue?.type === "keyword";
  const sizeCustomOptions = [{ name: "auto", label: "Auto" }];

  return (
    <>
      <Grid
        css={{ gridTemplateColumns: "4fr 6fr", mt: theme.spacing[5] }}
        align="center"
        gap={2}
      >
        <Label color="default" truncate>
          Size
        </Label>

        <Select
          // show empty field instead of radix placeholder
          // like css value input does
          placeholder=""
          options={selectOptions}
          getLabel={toPascalCase}
          value={selectValue}
          onChange={(name) => {
            if (name === "custom") {
              props.setProperty(property)({
                type: "tuple",
                value: [
                  { type: "keyword", value: "auto" },
                  { type: "keyword", value: "auto" },
                ],
              });
            } else {
              const cssValue = parseCssValue(property, name);
              props.setProperty(property)(cssValue);
            }
          }}
        />
      </Grid>

      <Grid
        css={{ mt: theme.spacing[4] }}
        align="center"
        columns={2}
        gapX={2}
        gapY={1}
      >
        <Label color="default" disabled={sizeCustomDisabled} truncate>
          Width
        </Label>

        <Label color="default" disabled={sizeCustomDisabled} truncate>
          Height
        </Label>

        <TextControl
          items={sizeCustomOptions}
          disabled={sizeCustomDisabled}
          setProperty={props.setProperty}
          deleteProperty={props.deleteProperty}
          currentStyle={props.currentStyle}
          property={property}
        />

        <TextControl
          items={sizeCustomOptions}
          disabled={sizeCustomDisabled}
          setProperty={props.setProperty}
          deleteProperty={props.deleteProperty}
          currentStyle={props.currentStyle}
          property={property}
        />
      </Grid>
    </>
  );
};
