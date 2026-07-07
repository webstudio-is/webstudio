import { Box as Box, RichTextLink as RichTextLink } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <RichTextLink href={"#guidelines"} className={`w-rich-text-link`}>
        {"Read the usage guidelines"}
      </RichTextLink>
    </Box>
  );
};

export default {
  title: "Components/RichTextLink",
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
  a.w-rich-text-link {
    box-sizing: border-box;
    display: inline-block
  }
}

      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as RichTextLink };
