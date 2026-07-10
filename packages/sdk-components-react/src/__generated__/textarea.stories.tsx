import { Box as Box, Textarea as Textarea } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Textarea
        name={"notes"}
        placeholder={"Add handoff notes"}
        className={`w-text-area`}
      />
    </Box>
  );
};

export default {
  title: "Components/Textarea",
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
  textarea.w-text-area {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    box-sizing: border-box;
    border-top-style: solid;
    border-right-style: solid;
    border-bottom-style: solid;
    border-left-style: solid;
    resize: none;
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

export { Story as Textarea };
