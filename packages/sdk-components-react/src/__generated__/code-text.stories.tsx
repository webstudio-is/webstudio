import { Box as Box, CodeText as CodeText } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <CodeText className={`w-code-text`}>{'status: "ready"'}</CodeText>
    </Box>
  );
};

export default {
  title: "Components/CodeText",
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
  code.w-code-text {
    font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 1em;
    box-sizing: border-box;
    display: block;
    padding-left: 0.2em;
    padding-right: 0.2em;
    background-color: rgb(238 238 238 / 1);
    white-space: pre-wrap;
    white-space-collapse: preserve
  }
}

      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as CodeText };
