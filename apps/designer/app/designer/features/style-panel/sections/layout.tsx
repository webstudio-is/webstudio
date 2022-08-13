import { Grid } from "@webstudio-is/design-system";
import type { RenderCategoryProps } from "../style-sections";
import { GridControl, LockControl, ShowMore } from "../controls";

const CSSLayoutSection = {
  alignItems: "center",
  gap: "$space$styleSection",
  "& > [data-type=iconbuttonwithmenu]": {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
};

const CSSLayoutSectionFlex = {
  ...CSSLayoutSection,
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
  // @todo justifyItems icons are using justifycontent icons atm
  "& > [data-property=justifyItems]": {
    display: "none",
  },
};

const LayoutSectionFlex = ({
  currentStyle,
  createBatchUpdate,
  styleConfigsByCategory,
}: RenderCategoryProps) => {
  const batchUpdate = createBatchUpdate();
  return (
    <Grid css={CSSLayoutSectionFlex}>
      {styleConfigsByCategory}
      <LockControl
        name="lock"
        currentStyle={{
          columnGap: currentStyle.columnGap,
          rowGap: currentStyle.rowGap,
        }}
        batchUpdate={batchUpdate}
      />
      <GridControl
        name="grid"
        currentStyle={currentStyle}
        batchUpdate={batchUpdate}
      />
    </Grid>
  );
};

const LayoutSection = ({
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

export { LayoutSection };
