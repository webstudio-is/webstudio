import { Box as Box, Heading as Heading } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Heading tag={"h2"} className={`w-heading`}>
        {"Operational UI pattern"}
      </Heading>
    </Box>
  );
};

export default {
  title: "Components/Heading",
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
  h2.w-heading {
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

export { Story as Heading };
