import { Box as Box, Button as Button } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Button className={`w-button`}>{"Save changes"}</Button>
    </Box>
  );
};

export default {
  title: "Components/Button",
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
  button.w-button {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    box-sizing: border-box;
    border-top-style: solid;
    border-right-style: solid;
    border-bottom-style: solid;
    border-left-style: solid;
    text-transform: none;
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

export { Story as Button };
