import { Box } from "./box";
import { Link } from "./link";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Library/Link",
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
  </>
);

export { LinkStory as Link };
