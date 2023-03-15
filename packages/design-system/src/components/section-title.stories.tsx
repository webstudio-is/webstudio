import { SectionTitle } from "./section-title";
import { Text } from "./text";
import { StoryGrid, StorySection } from "./storybook";
import { useState, type ComponentProps } from "react";

export default {
  title: "Library/Title/Of Section",
};

const Wrapped = ({
  initialIsOpen = false,
  ...props
}: Omit<
  ComponentProps<typeof SectionTitle>,
  "onOpen" | "onClose" | "isOpen"
> & {
  initialIsOpen?: boolean;
}) => {
  const [isOpen, setOpen] = useState(initialIsOpen);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 240, border: "dashed 3px #e3e3e3" }}>
        <SectionTitle
          isOpen={isOpen}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          {...props}
        />
      </div>
      <Text variant="mono">{isOpen ? "Open" : "Closed"}</Text>
    </div>
  );
};

export const Demo = () => (
  <>
    <StorySection title="Closed">
      <StoryGrid>
        <Wrapped>Title</Wrapped>
        <Wrapped onAdd={() => null}>Title</Wrapped>
      </StoryGrid>
    </StorySection>
    <StorySection title="Open">
      <StoryGrid>
        <Wrapped initialIsOpen>Title</Wrapped>
        <Wrapped onAdd={() => null} initialIsOpen>
          Title
        </Wrapped>
      </StoryGrid>
    </StorySection>
    <StorySection title="Long title">
      <StoryGrid>
        <Wrapped>Some title so long that it cannot possibly fit</Wrapped>
        <Wrapped onAdd={() => null}>
          Some title so long that it cannot possibly fit
        </Wrapped>
      </StoryGrid>
    </StorySection>
    <StorySection title="Focused (initially)">
      <StoryGrid>
        <Wrapped onAdd={() => null} autoFocus>
          Title
        </Wrapped>
      </StoryGrid>
    </StorySection>
  </>
);

Demo.storyName = "Of Section";
