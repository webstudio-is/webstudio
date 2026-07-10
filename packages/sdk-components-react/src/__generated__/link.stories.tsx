import { Box as Box, Link as Link } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Link href={"#components"} className={`w-link`}>
        {"View components"}
      </Link>
    </Box>
  );
};

export default {
  title: "Components/Link",
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
  a.w-link {
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

export { Story as Link };
