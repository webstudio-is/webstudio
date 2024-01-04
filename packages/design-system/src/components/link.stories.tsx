import { linkStyle } from "./link";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Library/Link",
};

export const Link = () => (
  <>
    <StorySection title="Variants">
      <StoryGrid
        css={{
          alignItems: "flex-start",
        }}
      >
        <a className={linkStyle()} href="">
          Regular
        </a>
        <a className={linkStyle({ variant: "label" })} href="">
          Label
        </a>
        <a className={linkStyle({ variant: "mono" })} href="">
          Mono
        </a>
      </StoryGrid>
    </StorySection>
    <StorySection title="Colors">
      <StoryGrid
        css={{
          alignItems: "flex-start",
        }}
      >
        <a className={linkStyle()} href="">
          Main
        </a>
        <a className={linkStyle({ color: "contrast" })} href="">
          Contrast
        </a>
        <a className={linkStyle({ color: "subtle" })} href="">
          Subtle
        </a>
        <a className={linkStyle({ color: "moreSubtle" })} href="">
          More Subtle
        </a>
      </StoryGrid>
    </StorySection>
  </>
);
