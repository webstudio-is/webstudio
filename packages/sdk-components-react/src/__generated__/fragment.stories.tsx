import { Box as Box, Fragment as Fragment, Text as Text } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Fragment>
        <Text className={`w-text`}>{"Reusable fragment content"}</Text>
      </Fragment>
    </Box>
  );
};

export default {
  title: "Components/Fragment",
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

export { Story as Fragment };
