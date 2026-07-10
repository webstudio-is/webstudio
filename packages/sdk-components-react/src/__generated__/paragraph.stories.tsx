import { Box as Box, Paragraph as Paragraph } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Paragraph className={`w-paragraph`}>
        {
          "Use these patterns to compose dense operational screens that stay readable under pressure."
        }
      </Paragraph>
    </Box>
  );
};

export default {
  title: "Components/Paragraph",
};

const Story = {
  render() {
    return (
      <>
        <style>
          {`
@layer presets {
  div.w-box {
    box-sizing: border-box
  }
  p.w-paragraph {
    box-sizing: border-box
  }
}

      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Paragraph };
