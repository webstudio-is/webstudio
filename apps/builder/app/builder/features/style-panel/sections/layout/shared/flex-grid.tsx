import type { CSSProperties } from "react";
import {
  Box,
  Flex,
  Grid,
  DeprecatedIconButton,
} from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import { DotIcon } from "@webstudio-is/icons";
import type { CreateBatchUpdate } from "../../../shared/use-style-data";
import { getStyleSource, type StyleInfo } from "../../../shared/style-info";
import { theme } from "@webstudio-is/design-system";

// Sometimes we need to hide a dot that ends up at an end
// of a line and visually extends it
const shouldHideDot = ({
  x,
  y,
  justifyContent,
  alignItems,
}: {
  x: number;
  y: number;
  justifyContent: string;
  alignItems: string;
}) => {
  if (justifyContent === "space-between") {
    if (alignItems === "start" || alignItems === "baseline") {
      return x === 2 && y === 0;
    }
    if (alignItems === "end") {
      return x === 2 && y === 2;
    }
  }

  return false;
};

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

  let color = theme.colors.foregroundFlexUiMain;
  if (styleSource === "local") {
    color = theme.colors.borderLocalFlexUi;
  }
  if (styleSource === "overwritten") {
    color = theme.colors.borderOverwrittenFlexUi;
  }
  if (styleSource === "remote") {
    color = theme.colors.borderRemoteFlexUi;
  }

  const addjustLinesPadding = (padding: number | undefined) => {
    if (padding === undefined) {
      return {};
    }
    return isFlexDirectionColumn
      ? { paddingTop: padding, paddingBottom: padding }
      : { paddingLeft: padding, paddingRight: padding };
  };

  return (
    <Grid
      tabIndex={0}
      css={{
        width: 72,
        height: 72,
        padding: theme.spacing[4],
        borderRadius: theme.borderRadius[4],
        background: theme.colors.backgroundControls,
        alignItems: "center",
        gap: 0,
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(3, 1fr)",
        color,
        outlineStyle: "solid",
        outlineWidth: styleSource === "default" ? 1 : 2,
        outlineOffset: styleSource === "default" ? -1 : -2,
        outlineColor: color,
        "&:focus-within": {
          outlineWidth: 2,
          outlineOffset: -2,
          outlineColor: theme.colors.borderLocalFlexUi,
        },
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
              tabIndex={-1}
              css={{
                width: "100%",
                height: "100%",
                color: theme.colors.foregroundFlexUiMain,
                "&:hover": {
                  // @todo not clear which token to use here
                  background: theme.colors.slate4,
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
                setAlignItems({ type: "keyword", value: alignItems });
                setJustifyContent({ type: "keyword", value: justifyContent });
                batchUpdate.publish();
              }}
            >
              {shouldHideDot({ x, y, justifyContent, alignItems }) ===
                false && <DotIcon />}
            </DeprecatedIconButton>
          </Flex>
        );
      })}

      <Flex
        css={{
          width: "100%",
          height: "100%",
          gridArea: "-1 / -1 / 1 / 1", // fill whole grid
          p: 2,
          gap: 2,
          pointerEvents: "none",
        }}
        style={{
          flexDirection: flexDirection as CSSProperties["flexDirection"],
          justifyContent,
          alignItems,
          ...addjustLinesPadding(
            justifyContent === "space-between"
              ? 8
              : justifyContent === "space-around"
                ? 14.5
                : undefined
          ),
        }}
      >
        {[11, 16, 9].map((size) => (
          <Box
            key={size}
            css={{
              borderRadius: theme.borderRadius[1],
              backgroundColor: "currentColor",
              ...(isFlexDirectionColumn
                ? { minWidth: size, minHeight: 4 }
                : { minWidth: 4, minHeight: size }),
            }}
          />
        ))}
      </Flex>
    </Grid>
  );
};
