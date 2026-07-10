import { Box as Box, Video as Video } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Video
        controls={true}
        aria-label={"Workflow walkthrough video"}
        className={`w-video`}
      />
    </Box>
  );
};

export default {
  title: "Components/Video",
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
  video.w-video {
    max-width: 100%
  }
}

      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Video };
