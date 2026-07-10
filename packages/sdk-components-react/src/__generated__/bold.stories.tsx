import { Box as Box, Bold as Bold } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Bold className={`w-bold-text`}>{"Critical update"}</Bold>
    </Box>
  );
};

export default {
  title: "Components/Bold",
};

const Story = {
  render() {
    return (
      <>
        <style>
          {`
@layer presets {
  b.w-bold-text {
    font-weight: 700;
    box-sizing: border-box
  }
  div.w-box {
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

export { Story as Bold };
