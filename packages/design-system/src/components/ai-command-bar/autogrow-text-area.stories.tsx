import { AutogrowTextArea } from "./autogrow-text-area";
import { Box } from "../box";
import { Grid } from "../grid";
import { ScrollArea } from "../scroll-area";
import { StorySection, StoryGrid } from "../storybook";

export default {
  title: "Library/Autogrow Text Area",
};

export const Demo = () => {
  return (
    <>
      <StorySection title="Autogrow textarea">
        <StoryGrid css={{ width: 200 }}>
          <Box css={{ backgroundColor: "black", color: "white", padding: 8 }}>
            <AutogrowTextArea
              defaultValue={`1\n2\n3\n4\n5\n6\n7\n8`}
              placeholder="Enter value..."
            />
          </Box>
        </StoryGrid>
        <Box css={{ height: 16 }} />
        <StoryGrid css={{ width: 200 }}>
          <Box css={{ backgroundColor: "black", color: "white", padding: 8 }}>
            <AutogrowTextArea
              state="invalid"
              value="invalid value"
              placeholder="Enter value..."
            />
          </Box>
        </StoryGrid>
      </StorySection>

      <StorySection title="Autogrow textarea with scroll and max-height">
        <StoryGrid css={{ width: 200 }}>
          <Box css={{ backgroundColor: "black", color: "white", padding: 8 }}>
            <Grid>
              <ScrollArea css={{ maxHeight: 100 }}>
                <AutogrowTextArea
                  defaultValue={`1\n2\n3\n4\n5\n6\n7\n8`}
                  placeholder="Enter value..."
                />
              </ScrollArea>
            </Grid>
          </Box>
        </StoryGrid>
      </StorySection>
    </>
  );
};
Demo.storyName = "Autogrow Text Area";
