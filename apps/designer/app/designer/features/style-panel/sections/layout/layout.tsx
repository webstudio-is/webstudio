import { Box, Flex, Grid } from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import type { RenderCategoryProps } from "../../style-sections";
import { FlexGrid } from "./shared/flex-grid";
import { Lock } from "./shared/lock";
import { renderProperty } from "../../style-sections";
import { MenuControl, SelectControl, TextControl } from "../../controls";
import { PropertyName } from "../../shared/property-name";
import { ColumnGapIcon, RowGapIcon } from "@webstudio-is/icons";
import { styleConfigByName } from "../../shared/configs";

const LayoutSectionFlex = ({
  currentStyle,
  createBatchUpdate,
}: {
  currentStyle: RenderCategoryProps["currentStyle"];
  deleteProperty: RenderCategoryProps["deleteProperty"];
  createBatchUpdate: RenderCategoryProps["createBatchUpdate"];
}) => {
  const batchUpdate = createBatchUpdate();
  const { setProperty, deleteProperty } = batchUpdate;

  const flexWrapValue = currentStyle.flexWrap?.value;

  // From design: Notice that the align-content icon button is not visible by default.
  // This property only applies when flex-wrap is set to "wrap".
  const showAlignContent =
    flexWrapValue?.type === "keyword" &&
    (flexWrapValue.value === "wrap" || flexWrapValue.value === "wrap-reverse");

  return (
    <Flex css={{ flexDirection: "column", gap: "$spacing$5" }}>
      <Grid
        css={{
          gap: "$spacing$5",
          gridTemplateColumns: "repeat(2, $spacing$13) repeat(3, $spacing$13)",
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
        <Box css={{ gridArea: "flexDirection" }}>
          <MenuControl
            property="flexDirection"
            currentStyle={currentStyle}
            setProperty={setProperty}
            deleteProperty={deleteProperty}
          />
        </Box>
        <Box css={{ gridArea: "flexWrap" }}>
          <MenuControl
            property="flexWrap"
            currentStyle={currentStyle}
            setProperty={setProperty}
            deleteProperty={deleteProperty}
          />
        </Box>
        <Box css={{ gridArea: "alignItems" }}>
          <MenuControl
            property="alignItems"
            currentStyle={currentStyle}
            setProperty={setProperty}
            deleteProperty={deleteProperty}
          />
        </Box>
        <Box css={{ gridArea: "justifyContent" }}>
          <MenuControl
            property="justifyContent"
            currentStyle={currentStyle}
            setProperty={setProperty}
            deleteProperty={deleteProperty}
          />
        </Box>
        {showAlignContent && (
          <Box css={{ gridArea: "alignContent" }}>
            <MenuControl
              property="alignContent"
              currentStyle={currentStyle}
              setProperty={setProperty}
              deleteProperty={deleteProperty}
            />
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
          alignItems: "center",
        }}
      >
        <Box css={{ gridArea: "columnGap" }}>
          <TextControl
            icon={<ColumnGapIcon />}
            property="columnGap"
            currentStyle={currentStyle}
            setProperty={setProperty}
            deleteProperty={deleteProperty}
          />
        </Box>
        <Box css={{ gridArea: "lock", px: "$spacing$3" }}>
          <Lock
            pairedKeys={["columnGap", "rowGap"]}
            currentStyle={currentStyle}
            batchUpdate={batchUpdate}
          />
        </Box>
        <Box css={{ gridArea: "rowGap" }}>
          <TextControl
            icon={<RowGapIcon />}
            property="rowGap"
            currentStyle={currentStyle}
            setProperty={setProperty}
            deleteProperty={deleteProperty}
          />
        </Box>
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
  currentStyle,
  setProperty,
  deleteProperty,
  createBatchUpdate,
  styleConfigsByCategory,
}: RenderCategoryProps) => {
  const displayValue = toValue(currentStyle.display?.value);

  const { label, items } = styleConfigByName.display;

  return (
    <>
      <Grid css={{ gridTemplateColumns: "4fr 6fr" }}>
        <PropertyName
          property="display"
          label={label}
          onReset={() => deleteProperty("display")}
        />
        <SelectControl
          property="display"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
          // show only important values first and hide others with scroll
          items={items
            .filter((item) => orderedDisplayValues.includes(item.name))
            .sort(compareDisplayValues)}
        />
      </Grid>

      {displayValue === "flex" || displayValue === "inline-flex" ? (
        <LayoutSectionFlex
          deleteProperty={deleteProperty}
          createBatchUpdate={createBatchUpdate}
          currentStyle={currentStyle}
        />
      ) : (
        styleConfigsByCategory.map((entry) =>
          // exclude display already rendered above
          entry.property === "display" ? null : renderProperty(entry)
        )
      )}
    </>
  );
};
