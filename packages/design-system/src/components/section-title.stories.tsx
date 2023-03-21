import { SectionTitle, SectionTitleLabel } from "./section-title";
import { Text } from "./text";
import { StoryGrid, StorySection } from "./storybook";
import { useState, type ComponentProps } from "react";

export default {
  title: "Library/Section Title",
};

const Wrapped = ({
  initialIsOpen = false,
  onAdd,
  hasItems,
  children,
  autoFocus,
}: Omit<ComponentProps<typeof SectionTitle>, "isOpen" | "onOpenChange"> & {
  initialIsOpen?: boolean;
}) => {
  const [isOpen, setOpen] = useState(initialIsOpen);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 240, border: "dashed 3px #e3e3e3" }}>
        <SectionTitle
          isOpen={isOpen}
          onOpenChange={setOpen}
          hasItems={hasItems ?? ["local", "remote"]}
          onAdd={onAdd}
          autoFocus={autoFocus}
        >
          {children ?? <SectionTitleLabel>Title</SectionTitleLabel>}
        </SectionTitle>
      </div>
      <Text variant="mono">
        {isOpen ? "Open" : "Closed"}
        {hasItems === false && ", Empty"}
      </Text>
    </div>
  );
};

const Empty = () => {
  const [hasItems, setHasItems] = useState(false);
  return (
    <Wrapped
      onAdd={() => setHasItems(true)}
      initialIsOpen
      hasItems={hasItems ? ["local"] : false}
    />
  );
};

export const Demo = () => (
  <>
    <StorySection title="Closed">
      <StoryGrid>
        <Wrapped />
        <Wrapped onAdd={() => null} />
      </StoryGrid>
    </StorySection>
    <StorySection title="Open">
      <StoryGrid>
        <Wrapped initialIsOpen />
        <Wrapped onAdd={() => null} initialIsOpen />
      </StoryGrid>
    </StorySection>
    <StorySection title="Open, with colored label">
      <StoryGrid>
        <Wrapped hasItems={["local"]} initialIsOpen>
          <SectionTitleLabel color="local">Title</SectionTitleLabel>
        </Wrapped>
        <Wrapped hasItems={["local"]} onAdd={() => null} initialIsOpen>
          <SectionTitleLabel color="local">Title</SectionTitleLabel>
        </Wrapped>
      </StoryGrid>
    </StorySection>
    <StorySection title="Open, but empty">
      <StoryGrid>
        <Text>
          Looks like closed while empty. When you try to open it, an item gets
          added.
        </Text>
        <Empty />
      </StoryGrid>
    </StorySection>
    <StorySection title="Long title">
      <StoryGrid>
        <Wrapped>
          <SectionTitleLabel>
            Some title so long that it cannot possibly fit
          </SectionTitleLabel>
        </Wrapped>
        <Wrapped onAdd={() => null}>
          <SectionTitleLabel>
            Some title so long that it cannot possibly fit
          </SectionTitleLabel>
        </Wrapped>
      </StoryGrid>
    </StorySection>
    <StorySection title="Focused (initially)">
      <StoryGrid>
        <Wrapped onAdd={() => null} autoFocus />
      </StoryGrid>
    </StorySection>
  </>
);

Demo.storyName = "Section Title";
