import { Box as Box, Separator as Separator } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Separator className={`w-separator`} />
    </Box>
  );
};

export default {
  title: "Components/Separator",
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
  hr.w-separator {
    height: 1px;
    color: inherit;
    box-sizing: border-box;
    background-color: gray;
    border-top-style: none;
    border-right-style: none;
    border-left-style: none;
    border-bottom-style: none
  }
}

      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Separator };
