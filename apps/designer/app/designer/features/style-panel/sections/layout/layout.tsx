import { Grid } from "@webstudio-is/design-system";
import type { RenderCategoryProps } from "../../style-sections";
import { FlexGrid } from "./shared/flex-grid";
import { Lock } from "./shared/lock";
import { ShowMore } from "../../shared/show-more";

const layoutSectionStyle = {
  alignItems: "center",
  gap: "$space$styleSection",
  "& > [data-type=iconbuttonwithmenu]": {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  "& [data-property=display]": {
    "& > :first-child": {
      gridTemplateColumns: "auto 1fr",
      gap: "$space$2",
      fontWeight: "500",
      "& > :last-child": {
        width: "fit-content",
      },
    },
  },
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
  "& [data-control=text]": {
    "& > :first-child": {
      gridTemplateColumns: "repeat(1, 1fr)",
      "& > :first-child": {
        display: "none",
      },
    },
  },
  // @todo justifyItems icons are using justifycontent icons atm
  "& [data-property=justifyItems]": {
    display: "none",
  },
  "& [data-property=columnGap]": {
    gridArea: "6 / 1 / -1 / 7",
    paddingRight: "10px",
  },
  "& [data-property=rowGap]": {
    gridArea: "6 / 7 / -1 / -1",
    paddingLeft: "10px",
  },
};

const LayoutSectionFlex = ({
  currentStyle,
  createBatchUpdate,
  styleConfigsByCategory,
}: RenderCategoryProps) => {
  const batchUpdate = createBatchUpdate();
  return (
    <Grid css={layoutSectionFlexStyle}>
      {styleConfigsByCategory}
      <Lock
        name="lock"
        pairedKeys={["columnGap", "rowGap"]}
        currentStyle={{
          columnGap: currentStyle.columnGap,
          rowGap: currentStyle.rowGap,
        }}
        batchUpdate={batchUpdate}
      />
      <FlexGrid
        name="grid"
        currentStyle={currentStyle}
        batchUpdate={batchUpdate}
      />
    </Grid>
  );
};

export const LayoutSection = ({
  setProperty,
  createBatchUpdate,
  currentStyle,
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
        styleConfigsByCategory={styleConfigsByCategory}
        moreStyleConfigsByCategory={moreStyleConfigsByCategory}
      />
    );
  }

  return (
    <>
      <ShowMore styleConfigs={moreStyleConfigsByCategory} />
      {styleConfigsByCategory}
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
