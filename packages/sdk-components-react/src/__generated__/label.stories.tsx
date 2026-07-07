import { Box as Box, Label as Label } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Label className={`w-input-label`}>{"Workspace"}</Label>
    </Box>
  );
};

export default {
  title: "Components/Label",
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
  label.w-input-label {
    box-sizing: border-box;
    display: block
  }
}

      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Label };
