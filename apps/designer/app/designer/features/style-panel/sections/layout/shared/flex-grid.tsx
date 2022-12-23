import {
  Box,
  Flex,
  Grid,
  DeprecatedIconButton,
} from "@webstudio-is/design-system";
import type { Style } from "@webstudio-is/css-data";
import { toValue } from "@webstudio-is/css-engine";
import { DotFilledIcon } from "@webstudio-is/icons";
import { useIsFromCurrentBreakpoint } from "../../../shared/use-is-from-current-breakpoint";
import type { CreateBatchUpdate } from "../../../shared/use-style-data";

export const FlexGrid = ({
  currentStyle,
  batchUpdate,
}: {
  currentStyle: Style;
  batchUpdate: ReturnType<CreateBatchUpdate>;
}) => {
  const isCurrentBreakpoint = useIsFromCurrentBreakpoint([
    "flexDirection",
    "justifyContent",
    "justifyItems",
    "alignContent",
    "alignItems",
  ]);
  const flexDirection = toValue(currentStyle.flexDirection);
  const justifyContent = toValue(currentStyle.justifyContent);
  const alignItems = toValue(currentStyle.alignItems);
  const setAlignItems = batchUpdate.setProperty("alignItems");
  const setJustifyContent = batchUpdate.setProperty("justifyContent");
  const alignment = ["start", "center", "end"];
  const gridSize = alignment.length;

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
        color: isCurrentBreakpoint ? "$colors$blue9" : "$colors$slate8",
      }}
    >
      {Array.from(Array(gridSize * gridSize), (_, index) => {
        const x = index % gridSize;
        const y = Math.floor(index / gridSize);
        return (
          <Flex
            key={index}
            justify="center"
            align="center"
            css={{
              width: "100%",
              height: "100%",
              // grid edges starts with 1
              gridColumn: `${x + 1} / ${x + 2}`,
              gridRow: `${y + 1} / ${y + 2}`,
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
              ...(flexDirection === "column" ||
              flexDirection === "column-reverse"
                ? { minWidth: size, minHeight: 4 }
                : { minWidth: 4, minHeight: size }),
            }}
          ></Box>
        ))}
      </Flex>
    </Grid>
  );
};
