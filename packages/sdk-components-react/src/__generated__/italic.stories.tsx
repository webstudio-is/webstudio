import { Box as Box, Italic as Italic } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Italic className={`w-italic-text`}>{"Draft state"}</Italic>
    </Box>
  );
};

export default {
  title: "Components/Italic",
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
  i.w-italic-text {
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

export { Story as Italic };
