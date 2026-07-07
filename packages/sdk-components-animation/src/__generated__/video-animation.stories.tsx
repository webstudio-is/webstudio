import {
  Box as Box,
  Video as Video,
} from "@webstudio-is/sdk-components-react/components";
import { VideoAnimation as VideoAnimation } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <VideoAnimation className={`w-video-animation`}>
        <Video
          preload={"auto"}
          autoPlay={true}
          muted={true}
          playsInline={true}
          crossOrigin={"anonymous"}
          className={`w-video`}
        />
      </VideoAnimation>
    </Box>
  );
};

export default {
  title: "Components/VideoAnimation",
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
  div.w-video-animation {
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

export { Story as VideoAnimation };
