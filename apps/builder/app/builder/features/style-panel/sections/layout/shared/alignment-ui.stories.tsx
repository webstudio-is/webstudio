import { Box, Flex, theme } from "@webstudio-is/design-system";
import { AlignmentUi } from "./alignment-ui";

export default {
  title: "Style Panel/Layout/Alignment UI",
  component: AlignmentUi,
};

const alignItems = ["start", "center", "end", "stretch", "baseline"];
const justifyContent = [
  "start",
  "center",
  "end",
  "space-between",
  "space-around",
];

export const RowDirection = () => (
  <Box css={{ width: 72, color: theme.colors.foregroundFlexUiMain }}>
    <AlignmentUi
      justifyContent="center"
      alignItems="center"
      isColumnDirection={false}
      color="currentColor"
      itemStretchWidth={false}
      itemStretchHeight={false}
      onSelect={() => {}}
    />
  </Box>
);

export const ColumnDirection = () => (
  <Box css={{ width: 72, color: theme.colors.foregroundFlexUiMain }}>
    <AlignmentUi
      justifyContent="center"
      alignItems="center"
      isColumnDirection={true}
      color="currentColor"
      itemStretchWidth={false}
      itemStretchHeight={false}
      onSelect={() => {}}
    />
  </Box>
);

export const StretchedItems = () => (
  <Box css={{ width: 72, color: theme.colors.foregroundFlexUiMain }}>
    <AlignmentUi
      justifyContent="start"
      alignItems="stretch"
      isColumnDirection={false}
      color="currentColor"
      itemStretchWidth={false}
      itemStretchHeight={true}
      onSelect={() => {}}
    />
  </Box>
);

export const AllCombinations = () => (
  <Flex direction="column" gap="2">
    <Box css={{ fontSize: 10, paddingLeft: 80, fontWeight: "bold" }}>
      justify-content
    </Box>
    {alignItems.map((ai) => (
      <Flex key={ai} gap="2" align="center">
        <Box css={{ fontSize: 10, width: 70, textAlign: "right" }}>{ai}</Box>
        {justifyContent.map((jc) => (
          <Box
            key={jc}
            css={{ width: 72, color: theme.colors.foregroundFlexUiMain }}
          >
            <AlignmentUi
              justifyContent={jc}
              alignItems={ai}
              isColumnDirection={false}
              color="currentColor"
              itemStretchWidth={ai === "stretch"}
              itemStretchHeight={false}
              onSelect={() => {}}
            />
          </Box>
        ))}
      </Flex>
    ))}
  </Flex>
);
