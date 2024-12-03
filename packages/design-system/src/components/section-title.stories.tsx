import {
  SectionTitle,
  SectionTitleLabel,
  SectionTitleButton,
} from "./section-title";
import { StoryGrid, StorySection } from "./storybook";
import type { ComponentProps } from "react";
import { PlusIcon } from "@webstudio-is/icons";

export default {
  title: "Library/Section Title",
};

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div style={{ width: 240, border: "dashed 3px #e3e3e3" }}>{children}</div>
);

const Variants = ({
  state,
  noContent,
}: {
  state: ComponentProps<typeof SectionTitle>["data-state"];
  noContent: ComponentProps<typeof SectionTitle>["noContent"];
}) => (
  <>
    <Wrap>
      <SectionTitle data-state={state} noContent={noContent}>
        <SectionTitleLabel>Simplest</SectionTitleLabel>
      </SectionTitle>
    </Wrap>
    <Wrap>
      <SectionTitle
        suffix={<SectionTitleButton prefix={<PlusIcon />} />}
        data-state={state}
        noContent={noContent}
      >
        <SectionTitleLabel>With button</SectionTitleLabel>
      </SectionTitle>
    </Wrap>
    <Wrap>
      <SectionTitle
        dots={["local", "remote"]}
        suffix={<SectionTitleButton prefix={<PlusIcon />} />}
        data-state={state}
        noContent={noContent}
      >
        <SectionTitleLabel>With dots</SectionTitleLabel>
      </SectionTitle>
    </Wrap>
    <Wrap>
      <SectionTitle
        dots={["local"]}
        suffix={<SectionTitleButton prefix={<PlusIcon />} />}
        data-state={state}
        noContent={noContent}
      >
        <SectionTitleLabel color="local">With label</SectionTitleLabel>
      </SectionTitle>
    </Wrap>
    <Wrap>
      <SectionTitle
        dots={["local", "remote"]}
        suffix={<SectionTitleButton prefix={<PlusIcon />} />}
        data-state={state}
        noContent={noContent}
      >
        <SectionTitleLabel>
          Some title so long that it cannot possibly fit
        </SectionTitleLabel>
      </SectionTitle>
    </Wrap>
    <Wrap>
      <SectionTitle data-state={state} noContent={noContent}>
        <SectionTitleLabel>
          Some title so long that it cannot possibly fit
        </SectionTitleLabel>
      </SectionTitle>
    </Wrap>
  </>
);

export const Demo = () => (
  <>
    <StorySection title="Focused (intially)">
      <StoryGrid>
        <Wrap>
          <SectionTitle
            dots={["local", "remote"]}
            suffix={<SectionTitleButton prefix={<PlusIcon />} />}
            autoFocus
          >
            <SectionTitleLabel>Title</SectionTitleLabel>
          </SectionTitle>
        </Wrap>
      </StoryGrid>
    </StorySection>

    <StorySection title="Closed">
      <StoryGrid>
        <Variants state="closed" />
      </StoryGrid>
    </StorySection>

    <StorySection title="Open">
      <StoryGrid>
        <Variants state="open" />
      </StoryGrid>
    </StorySection>

    <StorySection title="Inactive">
      <StoryGrid>
        <Variants noContent state="closed" />
      </StoryGrid>
    </StorySection>
  </>
);

Demo.storyName = "Section Title";
