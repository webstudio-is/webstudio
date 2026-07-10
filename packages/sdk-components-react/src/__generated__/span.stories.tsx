import { Box as Box, Span as Span } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Span className={`w-text`}>{"Inline status"}</Span>
    </Box>
  );
};

export default {
  title: "Components/Span",
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
  span.w-text {
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

export { Story as Span };
