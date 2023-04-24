import { Box, Flex } from "@webstudio-is/design-system";
import { FlexGrid } from "./flex-grid";

export default {
  component: FlexGrid,
};

const batchUpdate = {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setProperty: () => () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  deleteProperty: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  publish: () => {},
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

const Base = ({ flexDirection }: { flexDirection: string }) => {
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
                <FlexGrid
                  currentStyle={{
                    flexDirection: {
                      value: { type: "keyword", value: flexDirection },
                    },
                    justifyContent: {
                      value: { type: "keyword", value: justifyContent },
                    },
                    alignItems: {
                      value: { type: "keyword", value: alignItems },
                    },
                  }}
                  batchUpdate={batchUpdate}
                />
              </Box>
            ))}
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
};

export const Row = () => {
  return <Base flexDirection="row" />;
};

export const RowReverse = () => {
  return <Base flexDirection="row-reverse" />;
};

export const Column = () => {
  return <Base flexDirection="column" />;
};

export const ColumnReverse = () => {
  return <Base flexDirection="column-reverse" />;
};
