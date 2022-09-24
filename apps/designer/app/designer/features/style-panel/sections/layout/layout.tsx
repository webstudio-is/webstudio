import { Box, Flex, Grid } from "@webstudio-is/design-system";
import type { RenderCategoryProps } from "../../style-sections";
import { FlexGrid } from "./shared/flex-grid";
import { Lock } from "./shared/lock";
import { ShowMore } from "../../shared/show-more";
import { renderProperty } from "../../style-sections";
import { MenuControl, SelectControl, TextControl } from "../../controls";
import { PropertyName } from "../../shared/property-name";

const layoutSectionStyle = {
  alignItems: "center",
  gap: "$space$styleSection",
};

const layoutSectionFlexStyle = {
  ...layoutSectionStyle,
  gridTemplateColumns: "repeat(12, 1fr)",
  gridTemplateRows: "auto 0px auto auto 0px auto",
  gridTemplateAreas: `
	  "display display display display display display display display display display display display"
	  "grid grid grid grid grid . . . . . . ."
	  "grid grid grid grid grid flexDirection flexDirection flexWrap flexWrap justifyItems justifyItems ."
	  "grid grid grid grid grid alignItems alignItems justifyContent justifyContent alignContent alignContent ."
	  "grid grid grid grid grid . . . . . . ."
	  "columnGap columnGap columnGap columnGap columnGap lock lock rowGap rowGap rowGap rowGap rowGap"
	`,
};

const LayoutSectionFlex = ({
  currentStyle,
  sectionStyle,
  createBatchUpdate,
}: RenderCategoryProps) => {
  const {
    display,
    flexDirection,
    flexWrap,
    alignItems,
    justifyContent,
    alignContent,
    columnGap,
    rowGap,
  } = sectionStyle;
  const batchUpdate = createBatchUpdate();
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
          property={display.styleConfig.property}
          label={display.styleConfig.label}
        />
        <SelectControl {...display} />
      </Grid>
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
        <Box css={{ gridArea: "flexDirection" }}>
          <MenuControl {...flexDirection} />
        </Box>
        <Box css={{ gridArea: "flexWrap" }}>
          <MenuControl {...flexWrap} />
        </Box>
        <Box css={{ gridArea: "alignItems" }}>
          <MenuControl {...alignItems} />
        </Box>
        <Box css={{ gridArea: "justifyContent" }}>
          <MenuControl {...justifyContent} />
        </Box>
        {alignContent && (
          <Box css={{ gridArea: "alignContent" }}>
            <MenuControl {...alignContent} />
          </Box>
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
          <TextControl {...columnGap} />
        </Box>
        <Box css={{ gridArea: "lock", px: "$1" }}>
          <Lock
            pairedKeys={["columnGap", "rowGap"]}
            currentStyle={currentStyle}
            batchUpdate={batchUpdate}
          />
        </Box>
        <Box css={{ gridArea: "rowGap" }}>
          <TextControl {...rowGap} />
        </Box>
      </Grid>
    </Flex>
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
  const ActiveLayout = layouts.get(String(currentStyle.display?.value));

  if (ActiveLayout) {
    return (
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
    );
  }

  return (
    <>
      <ShowMore
        styleConfigs={moreStyleConfigsByCategory.map((entry) =>
          renderProperty(entry)
        )}
      />
      {styleConfigsByCategory.map((entry) => renderProperty(entry))}
    </>
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
