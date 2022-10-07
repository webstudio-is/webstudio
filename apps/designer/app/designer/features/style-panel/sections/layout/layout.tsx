import { Box, Flex, Grid } from "@webstudio-is/design-system";
import type { RenderCategoryProps } from "../../style-sections";
import { FlexGrid } from "./shared/flex-grid";
import { Lock } from "./shared/lock";
import { MenuControl, SelectControl, TextControl } from "../../controls";
import { PropertyName } from "../../shared/property-name";

const LayoutSectionFlex = ({
  currentStyle,
  sectionStyle,
  createBatchUpdate,
}: RenderCategoryProps) => {
  const batchUpdate = createBatchUpdate();
  return (
    <>
      <Grid
        css={{
          gap: "$2",
          gridTemplateColumns: "repeat(2, $6) repeat(3, $6)",
          gridTemplateRows: "repeat(2, $6)",
          gridTemplateAreas: `
            "grid grid flexDirection flexWrap ."
            "grid grid alignItems justifyContent alignContent"
          `,
        }}
      >
        <Box css={{ gridArea: "grid" }}>
          <FlexGrid currentStyle={currentStyle} batchUpdate={batchUpdate} />
        </Box>
        {(
          [
            "flexDirection",
            "flexWrap",
            "alignItems",
            "justifyContent",
            "alignContent",
          ] as const
        ).map(
          (type) =>
            sectionStyle[type] && (
              <Box css={{ gridArea: type }} key={type}>
                <MenuControl {...sectionStyle[type]} />
              </Box>
            )
        )}
      </Grid>
      <Grid
        css={{
          gridTemplateColumns: "4fr 1fr 4fr",
          gridTemplateRows: "auto",
          gridTemplateAreas: `
            "columnGap lock rowGap"
          `,
        }}
      >
        <Box css={{ gridArea: "columnGap" }}>
          <TextControl {...sectionStyle["columnGap"]} />
        </Box>
        <Box css={{ gridArea: "lock", px: "$1" }}>
          <Lock
            pairedKeys={["columnGap", "rowGap"]}
            currentStyle={currentStyle}
            batchUpdate={batchUpdate}
          />
        </Box>
        <Box css={{ gridArea: "rowGap" }}>
          <TextControl {...sectionStyle["rowGap"]} />
        </Box>
      </Grid>
    </>
  );
};

export const LayoutSection = ({
  setProperty,
  createBatchUpdate,
  currentStyle,
  sectionStyle,
  inheritedStyle,
  category,
  styleConfigsByCategory,
  moreStyleConfigsByCategory,
}: RenderCategoryProps) => {
  const ActiveLayout =
    layouts.get(String(currentStyle.display?.value)) ?? (() => null);

  return (
    <Flex css={{ flexDirection: "column", gap: "$2" }}>
      <Grid
        css={{
          gridArea: "display",
          gridTemplateColumns: "auto 1fr",
          gap: "$space$2",
          width: "fit-content",
          fontWeight: "500",
        }}
      >
        <PropertyName
          property={sectionStyle.display.styleConfig.property}
          label={sectionStyle.display.styleConfig.label}
        />
        <SelectControl {...sectionStyle.display} />
      </Grid>
      <ActiveLayout
        setProperty={setProperty}
        createBatchUpdate={createBatchUpdate}
        currentStyle={currentStyle}
        sectionStyle={sectionStyle}
        inheritedStyle={inheritedStyle}
        category={category}
        styleConfigsByCategory={styleConfigsByCategory}
        moreStyleConfigsByCategory={moreStyleConfigsByCategory}
      />
    </Flex>
  );
};

const layouts = new Map([
  ["none", null],
  ["block", null],
  ["inline-block", null],
  ["flex", LayoutSectionFlex],
  ["inline-flex", LayoutSectionFlex],
  ["grid", null],
  ["inline-grid", null],
]);
