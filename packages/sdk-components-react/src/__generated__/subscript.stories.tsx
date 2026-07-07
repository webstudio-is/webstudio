import { Box as Box, Subscript as Subscript } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Subscript className={`w-subscript-text`}>{"beta"}</Subscript>
    </Box>
  );
};

export default {
  title: "Components/Subscript",
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
  sub.w-subscript-text {
    font-size: 75%;
    line-height: 0;
    position: relative;
    vertical-align: baseline;
    box-sizing: border-box;
    bottom: -0.25em
  }
}

      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Subscript };
