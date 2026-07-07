import { Box as Box, Input as Input } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Input
        name={"workspace"}
        placeholder={"Workspace name"}
        className={`w-text-input`}
      />
    </Box>
  );
};

export default {
  title: "Components/Input",
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
  input.w-text-input {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    box-sizing: border-box;
    border-top-style: solid;
    border-right-style: solid;
    border-bottom-style: solid;
    border-left-style: solid;
    display: block;
    margin: 0
  }
}

      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Input };
