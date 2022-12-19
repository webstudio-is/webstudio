import { Box, Flex, Grid } from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import type { RenderCategoryProps } from "../../style-sections";
import { FlexGrid } from "./shared/flex-grid";
import { Lock } from "./shared/lock";
import { renderProperty } from "../../style-sections";
import { MenuControl, SelectControl, TextControl } from "../../controls";
import { PropertyName } from "../../shared/property-name";
import { ColumnGapIcon, RowGapIcon } from "@webstudio-is/icons";
import { getFinalValue } from "../../shared/get-final-value";

const LayoutSectionFlex = ({
  currentStyle,
  sectionStyle,
  createBatchUpdate,
}: {
  deleteProperty: RenderCategoryProps["deleteProperty"];
  currentStyle: RenderCategoryProps["currentStyle"];
  sectionStyle: RenderCategoryProps["sectionStyle"];
  createBatchUpdate: RenderCategoryProps["createBatchUpdate"];
}) => {
  const {
    flexDirection,
    flexWrap,
    alignItems,
    justifyContent,
    alignContent,
    columnGap,
    rowGap,
  } = sectionStyle;
  const batchUpdate = createBatchUpdate();
  const hasMenuItems = [
    flexDirection,
    flexWrap,
    alignItems,
    justifyContent,
    alignContent,
  ].some((config) => config !== undefined);

  const flexWrapValue = getFinalValue({
    currentStyle: flexWrap.currentStyle,
    inheritedStyle: flexWrap.inheritedStyle,
    property: flexWrap.styleConfig.property,
  });

  // From design: Notice that the align-content icon button is not visible by default.
  // This property only applies when flex-wrap is set to "wrap".
  const showAlignContent =
    flexWrapValue?.type === "keyword" &&
    (flexWrapValue.value === "wrap" || flexWrapValue.value === "wrap-reverse");

  return (
    <Flex css={{ flexDirection: "column", gap: "$spacing$5" }}>
      {hasMenuItems && (
        <Grid
          css={{
            gap: "$spacing$5",
            gridTemplateColumns:
              "repeat(2, $spacing$13) repeat(3, $spacing$13)",
            gridTemplateRows: "repeat(2, $spacing$13)",
            gridTemplateAreas: `
            "grid grid flexDirection flexWrap ."
            "grid grid alignItems justifyContent alignContent"
          `,
            alignItems: "center",
          }}
        >
          <Box css={{ gridArea: "grid" }}>
            <FlexGrid currentStyle={currentStyle} batchUpdate={batchUpdate} />
          </Box>
          {flexDirection?.styleConfig && (
            <Box css={{ gridArea: "flexDirection" }}>
              <MenuControl {...flexDirection} />
            </Box>
          )}
          {flexWrap?.styleConfig && (
            <Box css={{ gridArea: "flexWrap" }}>
              <MenuControl {...flexWrap} />
            </Box>
          )}
          {alignItems?.styleConfig && (
            <Box css={{ gridArea: "alignItems" }}>
              <MenuControl {...alignItems} />
            </Box>
          )}
          {justifyContent?.styleConfig && (
            <Box css={{ gridArea: "justifyContent" }}>
              <MenuControl {...justifyContent} />
            </Box>
          )}
          {alignContent && showAlignContent && (
            <Box css={{ gridArea: "alignContent" }}>
              <MenuControl {...alignContent} />
            </Box>
          )}
        </Grid>
      )}

      <Grid
        css={{
          gridTemplateColumns: "4fr 1fr 4fr",
          gridTemplateRows: "auto",
          gridTemplateAreas: `
            "columnGap lock rowGap"
          `,
          alignItems: "center",
        }}
      >
        {columnGap?.styleConfig && (
          <Box css={{ gridArea: "columnGap" }}>
            <TextControl icon={<ColumnGapIcon />} {...columnGap} />
          </Box>
        )}
        {rowGap?.styleConfig && columnGap?.styleConfig && (
          <Box css={{ gridArea: "lock", px: "$spacing$3" }}>
            <Lock
              pairedKeys={["columnGap", "rowGap"]}
              currentStyle={currentStyle}
              batchUpdate={batchUpdate}
            />
          </Box>
        )}
        {rowGap?.styleConfig && (
          <Box css={{ gridArea: "rowGap" }}>
            <TextControl icon={<RowGapIcon />} {...rowGap} />
          </Box>
        )}
      </Grid>
    </Flex>
  );
};

const orderedDisplayValues = [
  "block",
  "flex",
  "inline-block",
  "inline-flex",
  "inline",
  "none",
];

const compareDisplayValues = (a: { name: string }, b: { name: string }) => {
  const aIndex = orderedDisplayValues.indexOf(a.name);
  const bIndex = orderedDisplayValues.indexOf(b.name);
  return aIndex - bIndex;
};

export const LayoutSection = ({
  deleteProperty,
  createBatchUpdate,
  currentStyle,
  sectionStyle,
  styleConfigsByCategory,
}: RenderCategoryProps) => {
  const displayValue = toValue(currentStyle.display);

  const { display } = sectionStyle;

  return (
    <>
      {display?.styleConfig && (
        <Grid css={{ gridTemplateColumns: "4fr 6fr" }}>
          <PropertyName
            property="display"
            label={display.styleConfig.label}
            onReset={() => deleteProperty("display")}
          />
          <SelectControl
            category={display.category}
            currentStyle={display.currentStyle}
            inheritedStyle={display.inheritedStyle}
            setProperty={display.setProperty}
            deleteProperty={display.deleteProperty}
            // show only important values first and hide others with scroll
            styleConfig={{
              ...display.styleConfig,
              items: display.styleConfig.items
                .filter((item) => orderedDisplayValues.includes(item.name))
                .sort(compareDisplayValues),
            }}
          />
        </Grid>
      )}

      {displayValue === "flex" || displayValue === "inline-flex" ? (
        <LayoutSectionFlex
          deleteProperty={deleteProperty}
          createBatchUpdate={createBatchUpdate}
          currentStyle={currentStyle}
          sectionStyle={sectionStyle}
        />
      ) : (
        styleConfigsByCategory.map((entry) =>
          // exclude display already rendered above
          entry.styleConfig.property === "display"
            ? null
            : renderProperty(entry)
        )
      )}
    </>
  );
};
