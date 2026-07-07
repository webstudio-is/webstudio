import { Box as Box, Superscript as Superscript } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Superscript className={`w-superscript-text`}>{"new"}</Superscript>
    </Box>
  );
};

export default {
  title: "Components/Superscript",
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
  sup.w-superscript-text {
    font-size: 75%;
    line-height: 0;
    position: relative;
    vertical-align: baseline;
    box-sizing: border-box;
    top: -0.5em
  }
}

      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Superscript };
