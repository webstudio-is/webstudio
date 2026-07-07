import { Box as Box, Image as Image } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Image
        src={
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23eef2ff'/%3E%3Cpath d='M96 264l120-120 88 88 56-56 184 184H96z' fill='%2394a3b8'/%3E%3Ccircle cx='456' cy='112' r='44' fill='%23f59e0b'/%3E%3C/svg%3E"
        }
        alt={"Abstract dashboard illustration"}
        width={640}
        height={360}
        className={`w-image`}
      />
    </Box>
  );
};

export default {
  title: "Components/Image",
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
  img.w-image {
    box-sizing: border-box;
    max-width: 100%;
    display: block;
    height: auto
  }
}

      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Image };
