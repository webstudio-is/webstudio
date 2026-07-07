import { Box } from "./box";
import { Link } from "./link";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Link",
};

const LinkStory = () => (
  <>
    <StorySection title="Variant">
      <StoryGrid
        css={{
          alignItems: "flex-start",
        }}
      >
        <Link href="">Regular</Link>
        <Link variant="label" href="">
          Label
        </Link>
        <Link variant="mono" href="">
          Mono
        </Link>
        <Link variant="monoBold" href="">
          Mono Bold
        </Link>
        <div style={{ fontSize: 20 }}>
          <Link variant="inherit" href="">
            Inherit
          </Link>
        </div>
      </StoryGrid>
    </StorySection>
    <StorySection title="Underline">
      <StoryGrid
        css={{
          alignItems: "flex-start",
        }}
      >
        <Link href="" underline="none">
          None
        </Link>
        <Link href="" underline="hover">
          Hover
        </Link>
        <Link href="" underline="always">
          Always
        </Link>
      </StoryGrid>
    </StorySection>
    <StorySection title="Colors">
      <StoryGrid
        css={{
          alignItems: "flex-start",
        }}
      >
        <Link color="main" href="">
          Main
        </Link>
        <Box css={{ backgroundColor: "black" }}>
          <Link color="contrast" href="">
            Contrast
          </Link>
        </Box>
        <Link color="subtle" href="">
          Subtle
        </Link>
        <Link color="moreSubtle" href="">
          More Subtle
        </Link>
        <div style={{ color: "blue" }}>
          <Link color="inherit" href="">
            Inherit
          </Link>
        </div>
      </StoryGrid>
    </StorySection>
    <StorySection title="Stretched link">
      <Box css={{ position: "relative" }}>
        <Link href="" stretched>
          This link stretches to cover the parent container
        </Link>
      </Box>
    </StorySection>
    <StorySection title="Disabled link">
      <StoryGrid css={{ alignItems: "flex-start" }}>
        <Link href="" aria-disabled="true">
          Regular disabled
        </Link>
        <Link href="" variant="label" aria-disabled="true">
          Label disabled
        </Link>
        <Link href="" variant="mono" aria-disabled="true">
          Mono disabled
        </Link>
      </StoryGrid>
    </StorySection>
  </>
);

export { LinkStory as Link };
