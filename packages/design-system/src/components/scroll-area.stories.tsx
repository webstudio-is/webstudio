import { StorySection } from "./storybook";
import { ScrollArea as ScrollAreaComponent } from "./scroll-area";
import { Text } from "./text";
import { theme } from "..";
import { Flex } from "./flex";

export default {
  title: "Scroll Area",
};

export const ScrollArea = () => {
  const content = (
    <div style={{ height: 1000, width: 1000 }}>
      {Array.from(new Array(100))
        .map(() => {
          return "a".repeat(300);
        })
        .join("\n")}
    </div>
  );
  const css = {
    height: 100,
    width: 100,
    background: theme.colors.backgroundPanel,
  };
  return (
    <>
      <StorySection title="Vertical">
        <ScrollAreaComponent css={css}>{content}</ScrollAreaComponent>
      </StorySection>
      <StorySection title="Horizontal">
        <ScrollAreaComponent css={css} direction="horizontal">
          {content}
        </ScrollAreaComponent>
      </StorySection>
      <StorySection title="Both">
        <ScrollAreaComponent css={css} direction="both">
          {content}
        </ScrollAreaComponent>
      </StorySection>

      <StorySection title="No overflow">
        <div style={{ height: 200, width: 200 }}>
          <ScrollAreaComponent>
            <Flex direction="column" gap="2" style={{ padding: 8 }}>
              <Text>Short content</Text>
              <Text>No scrollbar needed</Text>
            </Flex>
          </ScrollAreaComponent>
        </div>
      </StorySection>
    </>
  );
};
