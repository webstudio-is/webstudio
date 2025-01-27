import { Scroll } from "@webstudio-is/sdk-components-animation";
import { parseCssValue } from "@webstudio-is/css-data";
import { Box, styled } from "@webstudio-is/design-system";

const H1 = styled("h1");

const DEBUG = false;

const Playground = () => {
  return (
    <Box>
      <Scroll
        debug={DEBUG}
        action={{
          type: "scroll",
          animations: [
            {
              timing: {
                fill: "backwards",
                rangeStart: ["start", { type: "unit", value: 0, unit: "%" }],
                rangeEnd: ["start", { type: "unit", value: 200, unit: "px" }],
              },
              keyframes: [
                {
                  offset: 0,
                  styles: {
                    transform: parseCssValue(
                      "transform",
                      "translate(0, -120px)"
                    ),
                    opacity: parseCssValue("opacity", "0.2"),
                  },
                },
              ],
            },
            {
              timing: {
                fill: "forwards",
                rangeStart: ["end", { type: "unit", value: 200, unit: "px" }],
                rangeEnd: ["end", { type: "unit", value: 0, unit: "%" }],
              },
              keyframes: [
                {
                  offset: 1,
                  styles: {
                    transform: parseCssValue(
                      "transform",
                      "translate(0, 120px)"
                    ),
                    opacity: parseCssValue("opacity", "0.0"),
                  },
                },
              ],
            },
          ],
        }}
      >
        <H1
          css={{
            position: "fixed",
            width: "100%",
            textAlign: "center",
            top: "80px",
            margin: 0,
            padding: 0,
            "&:hover": {
              color: "red",
            },
          }}
        >
          HELLO WORLD
        </H1>
      </Scroll>
      <Box css={{ height: "200px", backgroundColor: "#eee", p: 4 }}>
        Start scrolling, and when the current box scrolls out, the “HELLO WORLD”
        header will fly in and become hoverable. (During the animation, it won’t
        be hoverable.)
      </Box>
      <Box css={{ height: "200vh" }}></Box>
      <Box css={{ height: "200px", backgroundColor: "#eee", p: 4 }}>
        When you see this box, the “HELLO WORLD” header will fly out.
      </Box>
    </Box>
  );
};

export default Playground;

// Reduces Vercel function size from 29MB to 9MB for unknown reasons; effective when used in limited files.
export const config = {
  maxDuration: 30,
};
