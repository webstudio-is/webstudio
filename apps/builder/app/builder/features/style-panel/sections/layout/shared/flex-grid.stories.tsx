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

const REFERENCE = false;

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

                {REFERENCE && (
                  <div style={{ position: "absolute", inset: 0, opacity: 0.3 }}>
                    {alignItems === "stretch" &&
                      justifyContent === "center" && (
                        <svg
                          width="72"
                          height="72"
                          viewBox="0 0 72 72"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect
                            x="34"
                            y="8"
                            width="4"
                            height="56"
                            rx="1"
                            fill="#237CFF"
                          />
                          <rect
                            x="40"
                            y="8"
                            width="4"
                            height="56"
                            rx="1"
                            fill="#237CFF"
                          />
                          <rect
                            x="28"
                            y="8"
                            width="4"
                            height="56"
                            rx="1"
                            fill="#237CFF"
                          />
                        </svg>
                      )}

                    {alignItems === "stretch" &&
                      justifyContent === "space-between" && (
                        <svg
                          width="72"
                          height="72"
                          viewBox="0 0 72 72"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect
                            x="34"
                            y="8"
                            width="4"
                            height="56"
                            rx="1"
                            fill="#237CFF"
                          />
                          <rect
                            x="54"
                            y="8"
                            width="4"
                            height="56"
                            rx="1"
                            fill="#237CFF"
                          />
                          <rect
                            x="14"
                            y="8"
                            width="4"
                            height="56"
                            rx="1"
                            fill="#237CFF"
                          />
                        </svg>
                      )}

                    {alignItems === "stretch" &&
                      justifyContent === "space-around" && (
                        <svg
                          width="72"
                          height="72"
                          viewBox="0 0 72 72"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect
                            x="34"
                            y="8"
                            width="4"
                            height="56"
                            rx="1"
                            fill="#237CFF"
                          />
                          <rect
                            x="45"
                            y="8"
                            width="4"
                            height="56"
                            rx="1"
                            fill="#237CFF"
                          />
                          <rect
                            x="23"
                            y="8"
                            width="4"
                            height="56"
                            rx="1"
                            fill="#237CFF"
                          />
                        </svg>
                      )}

                    {alignItems === "center" && justifyContent === "end" && (
                      <svg
                        width="72"
                        height="72"
                        viewBox="0 0 72 72"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M54 29C54 28.4477 54.4477 28 55 28H57C57.5523 28 58 28.4477 58 29V43C58 43.5523 57.5523 44 57 44H55C54.4477 44 54 43.5523 54 43V29ZM48 32C48 31.4477 48.4477 31 49 31H51C51.5523 31 52 31.4477 52 32V40C52 40.5523 51.5523 41 51 41H49C48.4477 41 48 40.5523 48 40V32ZM61 32C60.4477 32 60 32.4477 60 33V39C60 39.5523 60.4477 40 61 40H63C63.5523 40 64 39.5523 64 39V33C64 32.4477 63.5523 32 63 32H61Z"
                          fill="#237CFF"
                        />
                      </svg>
                    )}

                    {alignItems === "stretch" && justifyContent === "end" && (
                      <svg
                        width="72"
                        height="72"
                        viewBox="0 0 72 72"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect
                          x="54"
                          y="8"
                          width="4"
                          height="56"
                          rx="1"
                          fill="#237CFF"
                        />
                        <rect
                          x="60"
                          y="8"
                          width="4"
                          height="56"
                          rx="1"
                          fill="#237CFF"
                        />
                        <rect
                          x="48"
                          y="8"
                          width="4"
                          height="56"
                          rx="1"
                          fill="#237CFF"
                        />
                      </svg>
                    )}
                  </div>
                )}
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
