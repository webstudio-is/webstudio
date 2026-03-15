import type { Meta } from "@storybook/react";
import { InsetLayout as InsetLayoutComponent } from "./inset-layout";
import { Flex, Grid, Text, theme } from "@webstudio-is/design-system";
import type { CssProperty } from "@webstudio-is/css-engine";

const Cell = ({ label = "auto" }: { label?: string }) => (
  <Text variant={"spaceSectionValueText"}>{label}</Text>
);

export const InsetLayout = () => (
  <Flex direction="column" gap="3" css={{ width: theme.sizes.sidebarWidth }}>
    <Text variant="labels">Default (no active properties)</Text>
    <Grid css={{ height: theme.spacing[18] }}>
      <InsetLayoutComponent
        renderCell={() => <Cell />}
        getActiveProperties={() => []}
        onHover={() => {}}
      />
    </Grid>

    <Text variant="labels">Single side active (top)</Text>
    <Grid css={{ height: theme.spacing[18] }}>
      <InsetLayoutComponent
        renderCell={(property) => (
          <Cell label={property === "top" ? "10px" : "auto"} />
        )}
        getActiveProperties={() => ["top"] as CssProperty[]}
        onHover={() => {}}
      />
    </Grid>

    <Text variant="labels">Opposing pair active (left + right)</Text>
    <Grid css={{ height: theme.spacing[18] }}>
      <InsetLayoutComponent
        renderCell={(property) => {
          if (property === "left") {
            return <Cell label="20%" />;
          }
          if (property === "right") {
            return <Cell label="5rem" />;
          }
          return <Cell />;
        }}
        getActiveProperties={() => ["left", "right"] as CssProperty[]}
        onHover={() => {}}
      />
    </Grid>

    <Text variant="labels">All sides active</Text>
    <Grid css={{ height: theme.spacing[18] }}>
      <InsetLayoutComponent
        renderCell={(property) => {
          const values: Record<string, string> = {
            top: "0px",
            right: "123.27rem",
            bottom: "auto",
            left: "-20%",
          };
          return <Cell label={values[property] ?? "auto"} />;
        }}
        getActiveProperties={() =>
          ["top", "right", "bottom", "left"] as CssProperty[]
        }
        onHover={() => {}}
      />
    </Grid>
  </Flex>
);

export default {
  title: "Style Panel/Inset Layout",
  component: InsetLayoutComponent,
} as Meta<typeof InsetLayoutComponent>;
