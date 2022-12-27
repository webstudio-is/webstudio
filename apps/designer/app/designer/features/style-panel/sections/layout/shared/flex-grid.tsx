import {
  Box,
  Flex,
  Grid,
  DeprecatedIconButton,
} from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import { DotFilledIcon } from "@webstudio-is/icons";
import type { CreateBatchUpdate } from "../../../shared/use-style-data";
import { getStyleSource, StyleInfo } from "../../../shared/style-info";

export const FlexGrid = ({
  currentStyle,
  batchUpdate,
}: {
  currentStyle: StyleInfo;
  batchUpdate: ReturnType<CreateBatchUpdate>;
}) => {
  const styleSource = getStyleSource(
    currentStyle.flexDirection,
    currentStyle.justifyContent,
    currentStyle.justifyItems,
    currentStyle.alignContent,
    currentStyle.alignItems
  );
  const flexDirection = toValue(currentStyle.flexDirection?.value);
  const justifyContent = toValue(currentStyle.justifyContent?.value);
  const alignItems = toValue(currentStyle.alignItems?.value);
  const setAlignItems = batchUpdate.setProperty("alignItems");
  const setJustifyContent = batchUpdate.setProperty("justifyContent");
  const alignment = ["start", "center", "end"];
  const gridSize = alignment.length;
  const isFlexDirectionColumn =
    flexDirection === "column" || flexDirection === "column-reverse";

  return (
    <Grid
      css={{
        width: "100%",
        aspectRatio: "1 / 1",
        padding: "$spacing$4",
        borderRadius: "4px",
        background: "$loContrast",
        border: "2px solid currentColor",
        alignItems: "center",
        gap: "$spacing$1",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(3, 1fr)",
        color: styleSource === "local" ? "$colors$blue9" : "$colors$slate8",
      }}
    >
      {Array.from(Array(gridSize * gridSize), (_, index) => {
        const x = index % gridSize;
        const y = Math.floor(index / gridSize);
        // grid edges starts with 1
        let gridColumn = `${x + 1} / ${x + 2}`;
        let gridRow = `${y + 1} / ${y + 2}`;
        if (isFlexDirectionColumn) {
          [gridColumn, gridRow] = [gridRow, gridColumn];
        }
        return (
          <Flex
            key={index}
            justify="center"
            align="center"
            css={{
              width: "100%",
              height: "100%",
              gridColumn,
              gridRow,
            }}
          >
            <DeprecatedIconButton
              css={{
                width: "100%",
                height: "100%",
                color: "$colors$gray8",
                "&:hover": {
                  bc: "$colors$slate4",
                },
                "&:focus": {
                  background: "none",
                  boxShadow: "none",
                  outline: "none",
                },
              }}
              onClick={() => {
                const justifyContent = alignment[x];
                const alignItems = alignment[y];
                setAlignItems(alignItems);
                setJustifyContent(justifyContent);
                batchUpdate.publish();
              }}
            >
              <DotFilledIcon />
            </DeprecatedIconButton>
          </Flex>
        );
      })}

      <Flex
        css={{
          width: "100%",
          height: "100%",
          // fill whole grid
          gridColumn: "-1 / 1",
          gridRow: "-1 / 1",
          p: 1,
          gap: 2,
          pointerEvents: "none",
          // controlled styles
          flexDirection,
          justifyContent,
          alignItems,
        }}
      >
        {[10, 16, 8].map((size) => (
          <Box
            key={size}
            css={{
              borderRadius: "calc($borderRadius$4 / 2)",
              backgroundColor: "currentColor",
              ...(isFlexDirectionColumn
                ? { minWidth: size, minHeight: 4 }
                : { minWidth: 4, minHeight: size }),
            }}
          ></Box>
        ))}
      </Flex>
    </Grid>
  );
};
