import { Box as Box, RadioButton as RadioButton } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <RadioButton
        name={"priority"}
        value={"standard"}
        aria-label={"Standard priority"}
        className={`w-radio`}
      />
    </Box>
  );
};

export default {
  title: "Components/RadioButton",
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
  input.w-radio {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    margin-top: 0;
    margin-right: 0.5em;
    margin-bottom: 0;
    margin-left: 0;
    box-sizing: border-box;
    border-top-style: none;
    border-right-style: none;
    border-bottom-style: none;
    border-left-style: none
  }
}

      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as RadioButton };
