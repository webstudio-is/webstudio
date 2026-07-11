import { Box as Box, JsonLd as JsonLd } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <JsonLd
        code={
          '{"@context":"https://schema.org","@type":"Organization","name":"Organization name"}'
        }
      />
    </Box>
  );
};

export default {
  title: "Components/JsonLd",
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
}

      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as JsonLd };
