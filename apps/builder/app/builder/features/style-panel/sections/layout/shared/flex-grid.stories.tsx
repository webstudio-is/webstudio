import { Box, Flex } from "@webstudio-is/design-system";
import { FlexGrid as FlexGridComponent } from "./flex-grid";

export default {
  component: FlexGridComponent,
};

const alignItems = ["normal", "stretch", "baseline", "center", "start", "end"];
const justifyContent = [
  "normal",
  "space-between",
  "space-around",
  "center",
  "start",
  "end",
];

export const FlexGrid = () => {
  return (
    <Flex>
      <Box
        css={{
          fontSize: 10,
          paddingTop: 200,
          paddingLeft: 6,
          fontWeight: "bold",
          writingMode: "vertical-lr",
          transform: "rotate(180deg)",
        }}
      >
        align-items
      </Box>
      <Flex direction="column" gap={2} css={{ color: "#000" }}>
        <Box css={{ fontSize: 10, paddingLeft: 200, fontWeight: "bold" }}>
          justify-content
        </Box>
        <Flex gap={2}>
          <Box css={{ fontSize: 10, writingMode: "vertical-lr" }}>&nbsp;</Box>
          {justifyContent.map((justifyContent) => (
            <Box key={justifyContent} css={{ width: 72, fontSize: 10 }}>
              {justifyContent}
            </Box>
          ))}
        </Flex>
        {alignItems.map((alignItems) => (
          <Flex key={alignItems} gap={2}>
            <Box
              css={{
                fontSize: 10,
                textAlign: "right",
                writingMode: "vertical-lr",
                transform: "rotate(180deg)",
              }}
            >
              {alignItems}
            </Box>
            {justifyContent.map((justifyContent) => (
              <Box key={justifyContent} css={{ position: "relative" }}>
                <FlexGridComponent />
              </Box>
            ))}
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
};
