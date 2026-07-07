import {
  Box as Box,
  Blockquote as Blockquote,
  Text as Text,
} from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Blockquote className={`w-blockquote`}>
        <Text className={`w-text`}>
          {
            "Operations teams need interfaces that make the next action obvious."
          }
        </Text>
      </Blockquote>
    </Box>
  );
};

export default {
  title: "Components/Blockquote",
};

const Story = {
  render() {
    return (
      <>
        <style>
          {`
@layer presets {
  blockquote.w-blockquote {
    margin-top: 0;
    margin-right: 0;
    margin-bottom: 10px;
    margin-left: 0;
    padding-top: 10px;
    padding-bottom: 10px;
    padding-left: 20px;
    padding-right: 20px;
    border-left: 5px solid rgb(226 226 226 / 1)
  }
  div.w-box {
    box-sizing: border-box
  }
  div.w-text {
    box-sizing: border-box;
    min-height: 1em
  }
}

      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Blockquote };
