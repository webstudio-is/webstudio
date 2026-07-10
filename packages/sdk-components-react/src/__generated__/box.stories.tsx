import { Box as Box, Text as Text } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Box className={`w-box w-example-card`}>
        <Text className={`w-text`}>{"Component example container"}</Text>
      </Box>
    </Box>
  );
};

export default {
  title: "Components/Box",
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
@media all {
  .w-example-card {
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
    border-bottom-left-radius: 8px;
    border: 1px solid #d4d4d8;
    padding: 16px
  }
}
      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Box };
