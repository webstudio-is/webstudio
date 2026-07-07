import { Box as Box } from "@webstudio-is/sdk-components-react/components";
import { Label as Label } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Label className={`w-label w-label-1`}>{"Form Label"}</Label>
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
  label.w-label {
    box-sizing: border-box
  }
}
@media all {
  .w-label-1 {
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 500
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
