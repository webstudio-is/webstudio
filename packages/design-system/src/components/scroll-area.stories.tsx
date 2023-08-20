import { StorySection } from "./storybook";
import { ScrollArea } from "./scroll-area";
import { theme } from "..";

export default {
  title: "Library/Scroll Area",
};

export const Story = () => {
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
    height: 200,
    width: 100,
    background: theme.colors.backgroundPanel,
  };
  return (
    <>
      <StorySection title="Vertical">
        <ScrollArea css={css}>{content}</ScrollArea>
      </StorySection>
      <StorySection title="Horizontal">
        <ScrollArea css={css} verticalOnly={false}>
          {content}
        </ScrollArea>
      </StorySection>
    </>
  );
};
Story.storyName = "Scroll Area";
