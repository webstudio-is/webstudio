import { Box, Grid } from "@webstudio-is/design-system";
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
  // "& > [data-type=iconbuttonwithmenu]": {
  //   display: "flex",
  //   justifyContent: "center",
  //   alignItems: "center",
  //   height: "100%",
  // },
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

// @todo shouldn't need this
const layoutSectionChildStyle = { width: "fit-content" };

const flexDirectionStyle = {
  gridArea: "flexDirection",
  ...layoutSectionChildStyle,
};
const flexWrapStyle = { gridArea: "flexWrap", ...layoutSectionChildStyle };
const alignItemsStyle = { gridArea: "alignItems", ...layoutSectionChildStyle };
const justifyContentStyle = {
  gridArea: "justifyContent",
  ...layoutSectionChildStyle,
};
const alignContentStyle = {
  gridArea: "alignContent",
  ...layoutSectionChildStyle,
};
const lockStyle = { gridArea: "lock", ...layoutSectionChildStyle };
const gridStyle = { gridArea: "grid", ...layoutSectionChildStyle };
const displayStyle = {
  gridArea: "display",
  gridTemplateColumns: "auto 1fr",
  gap: "$space$2",
  width: "fit-content",
  fontWeight: "500",
};
const columnGapStyle = {
  gridArea: "6 / 1 / -1 / 7",
  paddingRight: "10px",
};
const rowGapStyle = {
  gridArea: "6 / 7 / -1 / -1",
  paddingLeft: "10px",
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
    <Grid css={layoutSectionFlexStyle}>
      <Box css={gridStyle}>
        {" "}
        <FlexGrid currentStyle={currentStyle} batchUpdate={batchUpdate} />
      </Box>
      <Grid css={displayStyle}>
        <PropertyName
          property={display.styleConfig.property}
          label={display.styleConfig.label}
        />
        <SelectControl {...display} />
      </Grid>
      <Box css={flexDirectionStyle}>
        <MenuControl {...flexDirection} />
      </Box>
      <Box css={flexWrapStyle}>
        <MenuControl {...flexWrap} />
      </Box>
      <Box css={alignItemsStyle}>
        <MenuControl {...alignItems} />
      </Box>
      <Box css={justifyContentStyle}>
        <MenuControl {...justifyContent} />
      </Box>
      {alignContent && (
        <Box css={alignContentStyle}>
          <MenuControl {...alignContent} />
        </Box>
      )}
      <Box css={columnGapStyle}>
        <TextControl {...columnGap} hideLabel={true} />
      </Box>
      <Box css={rowGapStyle}>
        <TextControl {...rowGap} hideLabel={true} />
      </Box>
      <Box css={lockStyle}>
        <Lock
          pairedKeys={["columnGap", "rowGap"]}
          currentStyle={currentStyle}
          batchUpdate={batchUpdate}
        />
      </Box>
    </Grid>
  );
};

export const LayoutSection = ({
  setProperty,
  createBatchUpdate,
  currentStyle,
  sectionStyle,
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
        category={category}
        sectionStyle={sectionStyle}
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
