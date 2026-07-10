import { Box as Box, HtmlEmbed as HtmlEmbed } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <HtmlEmbed
        code={
          "<div style='padding:12px;border:1px dashed #94a3b8;border-radius:8px'>Embedded status widget</div>"
        }
        className={`w-html-embed`}
      />
    </Box>
  );
};

export default {
  title: "Components/HtmlEmbed",
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
  div.w-html-embed {
    display: contents;
    white-space: normal;
    white-space-collapse: collapse
  }
}

      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as HtmlEmbed };
