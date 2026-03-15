import { Box, Flex, theme } from "@webstudio-is/design-system";
import { AlignmentUi } from "./alignment-ui";

export default {
  title: "Style Panel/Layout/Alignment UI",
  component: AlignmentUi,
};

const alignItems = ["normal", "start", "center", "end", "stretch", "baseline"];
const justifyContent = [
  "normal",
  "start",
  "center",
  "end",
  "space-between",
  "space-around",
];

const CombinationGrid = ({
  isColumnDirection,
}: {
  isColumnDirection: boolean;
}) => (
  <Flex direction="column" gap="2">
    <Flex gap="2" align="center">
      <Box css={{ width: 70 }} />
      {justifyContent.map((jc) => (
        <Box
          key={jc}
          css={{
            width: 64,
            fontSize: 10,
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          {jc}
        </Box>
      ))}
    </Flex>
    {alignItems.map((ai) => (
      <Flex key={ai} gap="2" align="center">
        <Box css={{ fontSize: 10, width: 70, textAlign: "right" }}>{ai}</Box>
        {justifyContent.map((jc) => (
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
              itemStretchWidth={
                isColumnDirection && (ai === "stretch" || ai === "normal")
              }
              itemStretchHeight={
                !isColumnDirection && (ai === "stretch" || ai === "normal")
              }
              onSelect={() => {}}
            />
          </Box>
        ))}
      </Flex>
    ))}
  </Flex>
);

export const FlexRow = () => <CombinationGrid isColumnDirection={false} />;

export const FlexColumn = () => <CombinationGrid isColumnDirection={true} />;
