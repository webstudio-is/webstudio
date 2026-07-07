import { Box as Box, Text as Text } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Text className={`w-text`}>{"System message"}</Text>
    </Box>
  );
};

export default {
  title: "Components/Text",
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
  div.w-text {
    box-sizing: border-box;
    min-height: 1em
  }
}

      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Text };
