import { Box, Flex, Text, theme } from "@webstudio-is/design-system";
import { AlignmentUi } from "./alignment-ui";

export default {
  title: "Style Panel/Layout/Alignment UI",
  component: AlignmentUi,
};

const alignItemsValues = [
  "normal",
  "start",
  "center",
  "end",
  "stretch",
  "baseline",
];
const justifyContentValues = [
  "normal",
  "start",
  "center",
  "end",
  "space-between",
  "space-around",
];

const labelStyle = { fontSize: 10, fontFamily: "sans-serif" };

const CombinationGrid = ({
  title,
  isColumnDirection,
  itemStretchWidth,
  itemStretchHeight,
}: {
  title: string;
  isColumnDirection: boolean;
  itemStretchWidth: (ai: string) => boolean;
  itemStretchHeight: (ai: string) => boolean;
}) => (
  <Flex direction="column" gap="1">
    <Text css={{ ...labelStyle, fontWeight: "bold", fontSize: 12 }}>
      {title}
    </Text>
    <Flex direction="column" gap="2">
      <Flex gap="2" align="center">
        <Box css={{ width: 70 }} />
        {justifyContentValues.map((jc) => (
          <Box
            key={jc}
            css={{
              width: 64,
              ...labelStyle,
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            {jc}
          </Box>
        ))}
      </Flex>
      {alignItemsValues.map((ai) => (
        <Flex key={ai} gap="2" align="center">
          <Box css={{ ...labelStyle, width: 70, textAlign: "right" }}>{ai}</Box>
          {justifyContentValues.map((jc) => (
            <Box
              key={jc}
              css={{
                width: 64,
                height: 62,
                color: theme.colors.foregroundFlexUiMain,
              }}
            >
              <AlignmentUi
                justifyContent={jc}
                alignItems={ai}
                isColumnDirection={isColumnDirection}
                color="currentColor"
                itemStretchWidth={itemStretchWidth(ai)}
                itemStretchHeight={itemStretchHeight(ai)}
                onSelect={() => {}}
              />
            </Box>
          ))}
        </Flex>
      ))}
    </Flex>
  </Flex>
);

// Flex: itemStretchWidth/Height are always false
// (flex has no justify-items; stretch is purely from align-items)
export const Flex_ = () => (
  <Flex direction="column" gap="6">
    <CombinationGrid
      title="flex-direction: row"
      isColumnDirection={false}
      itemStretchWidth={() => false}
      itemStretchHeight={() => false}
    />
    <CombinationGrid
      title="flex-direction: column"
      isColumnDirection={true}
      itemStretchWidth={() => false}
      itemStretchHeight={() => false}
    />
  </Flex>
);

const isStretchOrNormal = (ai: string) => ai === "stretch" || ai === "normal";

// Grid: justify-items controls item stretch independently
// Show both justify-items: stretch (default) and justify-items: start (no stretch)
export const Grid_ = () => (
  <Flex direction="column" gap="6">
    <CombinationGrid
      title="grid-auto-flow: row, justify-items: stretch"
      isColumnDirection={false}
      itemStretchWidth={isStretchOrNormal}
      itemStretchHeight={() => false}
    />
    <CombinationGrid
      title="grid-auto-flow: row, justify-items: start"
      isColumnDirection={false}
      itemStretchWidth={() => false}
      itemStretchHeight={() => false}
    />
    <CombinationGrid
      title="grid-auto-flow: column, justify-items: stretch"
      isColumnDirection={true}
      itemStretchWidth={() => false}
      itemStretchHeight={isStretchOrNormal}
    />
    <CombinationGrid
      title="grid-auto-flow: column, justify-items: start"
      isColumnDirection={true}
      itemStretchWidth={() => false}
      itemStretchHeight={() => false}
    />
  </Flex>
);
