import type { SectionProps } from "../shared/section";
import { Grid, theme } from "@webstudio-is/design-system";
import { type StyleProperty } from "@webstudio-is/css-engine";

const property: StyleProperty = "transformOrigin";

export const TransformOrigin = (props: SectionProps) => {
  const { currentStyle } = props;
  const value = currentStyle[property]?.value;

  if (value?.type !== "tuple") {
    return;
  }

  return (
    <Grid
      css={{
        px: theme.spacing[9],
        gridTemplateColumns: `2fr 1fr`,
      }}
    >
      Implement transform origin
    </Grid>
  );
};
