import {
  SectionTitle as SectionTitleComponent,
  SectionTitleLabel,
  SectionTitleButton,
} from "./section-title";
import { StoryGrid, StorySection } from "./storybook";
import type { ComponentProps } from "react";
import { PlusIcon } from "@webstudio-is/icons";

export default {
  title: "Section Title",
};

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div style={{ width: 240, border: "dashed 3px #e3e3e3" }}>{children}</div>
);

const Variants = ({
  state,
  inactive,
}: {
  state: ComponentProps<typeof SectionTitleComponent>["data-state"];
  inactive?: ComponentProps<typeof SectionTitleComponent>["inactive"];
}) => (
  <>
    <Wrap>
      <SectionTitleComponent data-state={state} inactive={inactive}>
        <SectionTitleLabel>Simplest</SectionTitleLabel>
      </SectionTitleComponent>
    </Wrap>
    <Wrap>
      <SectionTitleComponent
        suffix={<SectionTitleButton prefix={<PlusIcon />} />}
        data-state={state}
        inactive={inactive}
      >
        <SectionTitleLabel>With button</SectionTitleLabel>
      </SectionTitleComponent>
    </Wrap>
    <Wrap>
      <SectionTitleComponent
        dots={["local", "remote"]}
        suffix={<SectionTitleButton prefix={<PlusIcon />} />}
        data-state={state}
        inactive={inactive}
      >
        <SectionTitleLabel>With dots</SectionTitleLabel>
      </SectionTitleComponent>
    </Wrap>
    <Wrap>
      <SectionTitleComponent
        dots={["local"]}
        suffix={<SectionTitleButton prefix={<PlusIcon />} />}
        data-state={state}
        inactive={inactive}
      >
        <SectionTitleLabel color="local">With label</SectionTitleLabel>
      </SectionTitleComponent>
    </Wrap>
    <Wrap>
      <SectionTitleComponent
        dots={["local", "remote"]}
        suffix={<SectionTitleButton prefix={<PlusIcon />} />}
        data-state={state}
        inactive={inactive}
      >
        <SectionTitleLabel>
          Some title so long that it cannot possibly fit
        </SectionTitleLabel>
      </SectionTitleComponent>
    </Wrap>
    <Wrap>
      <SectionTitleComponent data-state={state} inactive={inactive}>
        <SectionTitleLabel>
          Some title so long that it cannot possibly fit
        </SectionTitleLabel>
      </SectionTitleComponent>
    </Wrap>
  </>
);

export const SectionTitle = () => (
  <>
    <StorySection title="Focused (intially)">
      <StoryGrid>
        <Wrap>
          <SectionTitleComponent
            dots={["local", "remote"]}
            suffix={<SectionTitleButton prefix={<PlusIcon />} />}
            autoFocus
          >
            <SectionTitleLabel>Title</SectionTitleLabel>
          </SectionTitleComponent>
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
        <Variants inactive state="closed" />
      </StoryGrid>
    </StorySection>

    <StorySection title="Non-collapsible">
      <StoryGrid>
        <Wrap>
          <SectionTitleComponent collapsible={false}>
            <SectionTitleLabel>Not collapsible</SectionTitleLabel>
          </SectionTitleComponent>
        </Wrap>
        <Wrap>
          <SectionTitleComponent
            collapsible={false}
            suffix={<SectionTitleButton prefix={<PlusIcon />} />}
          >
            <SectionTitleLabel>With button</SectionTitleLabel>
          </SectionTitleComponent>
        </Wrap>
      </StoryGrid>
    </StorySection>

    <StorySection title="Overwritten dot">
      <StoryGrid>
        <Wrap>
          <SectionTitleComponent dots={["overwritten"]} data-state="closed">
            <SectionTitleLabel>Overwritten</SectionTitleLabel>
          </SectionTitleComponent>
        </Wrap>
        <Wrap>
          <SectionTitleComponent
            dots={["local", "overwritten", "remote"]}
            data-state="closed"
          >
            <SectionTitleLabel>All dots</SectionTitleLabel>
          </SectionTitleComponent>
        </Wrap>
      </StoryGrid>
    </StorySection>
  </>
);
