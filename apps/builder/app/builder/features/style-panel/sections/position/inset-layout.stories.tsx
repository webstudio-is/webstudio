import type { Meta } from "@storybook/react";
import { InsetLayout } from "./inset-layout";
import { Grid, theme, Text } from "@webstudio-is/design-system";

const Cell = () => (
  <Text variant={"spaceSectionValueText"}>auto{/*1.275&#8203;rem*/}</Text>
);

export const InsetLayoutComponent = () => (
  <Grid css={{ width: theme.spacing[22], height: theme.spacing[18] }}>
    <InsetLayout
      renderCell={() => <Cell />}
      getActiveProperties={() => []}
      onHover={(hoverProps) => {
        console.info(hoverProps);
      }}
    />
  </Grid>
);

export default {
  title: "Style Panel/Inset",
  component: InsetLayoutComponent,
} as Meta<typeof InsetLayoutComponent>;
