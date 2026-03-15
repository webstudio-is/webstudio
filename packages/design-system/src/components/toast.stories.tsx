import { Toast } from "./toast";
import { StorySection, StoryGrid } from "./storybook";
import { Image } from "@webstudio-is/image";
import { Box } from "./box";
import { css, theme } from "../stitches.config";
import { AlertCircleIcon } from "@webstudio-is/icons";

export default {
  title: "Toast",
};

const toastIconUrl = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="8" fill="#e0e0e0"/>
    <rect x="16" y="20" width="32" height="24" rx="2" fill="#888"/>
    <circle cx="26" cy="30" r="4" fill="#bbb"/>
    <polygon points="18,42 30,32 38,38 46,30 46,42" fill="#aaa"/>
  </svg>`
)}`;

const imageWidth = css({
  maxWidth: "100%",
});

const ImageIcon = () => (
  <Box css={{ width: theme.spacing[18] }}>
    <Image
      className={imageWidth()}
      src={toastIconUrl}
      optimize={false}
      width={64}
      loader={() => ""}
    />
  </Box>
);

const texts = [
  `We are what repeatedly do. Excellence is not an act but a habit.`,
  `We are what repeatedly do. Excellence is not an act but a habit.`,
  `We are what repeatedly do. Excellence is not an act but a habit. We are what repeatedly do. Excellence is not an act but a habit. We are what repeatedly do. Excellence is not an act but a habit.`,
  `Asset already exists`,
];

export const Design = () => {
  return (
    <>
      <StorySection title="Toast Design">
        <StoryGrid>
          <Toast>1. We are what repeatedly do.</Toast>

          <Toast>
            2. We are what repeatedly do. Excellence is not an act but a habit.
          </Toast>

          <Toast>
            3. We are what repeatedly do. We are what repeatedly do. Excellence
            is not an act but a habit.
          </Toast>

          <Toast>
            3. We are what repeatedly do. We are what repeatedly do. Excellence
            is not an act but a habit. We are what
          </Toast>

          <Toast>
            4. We are what repeatedly do. We are what repeatedly do. We are what
            repeatedly do. Excellence is not an act but a habit.
          </Toast>

          <Toast>
            5. We are what repeatedly do. We are what repeatedly do. We are what
            repeatedly do. We are what repeatedly do. Excellence is not an act
            but a habit.
          </Toast>

          <Toast>
            6. We are what repeatedly do. We are what repeatedly do. We are what
            repeatedly do. We are what repeatedly do. We are what repeatedly do.
            Excellence is not an act but a habit.
          </Toast>

          <Toast variant="warning">
            We are what repeatedly do. Excellence is not an act but a habit.
          </Toast>

          <Toast variant="error">
            We are what repeatedly do. Excellence is not an act but a habit. We
            are what repeatedly do. Excellence is not an act but a habit. We are
            what repeatedly do. Excellence is not an act but a habit.
          </Toast>
          <Toast variant="success">
            We are what repeatedly do. Excellence is not an act but a habit. We
            are what repeatedly do. Excellence is not an act but a habit. We are
            what repeatedly do. Excellence is not an act but a habit.
          </Toast>
        </StoryGrid>
      </StorySection>

      <StorySection title="Toast With Icon Design">
        <StoryGrid>
          <Toast icon={<AlertCircleIcon size={24} />}>
            We are what repeatedly do. Excellence is not an act but a habit.
          </Toast>

          <Toast icon={<AlertCircleIcon size={24} />} variant="warning">
            We are what repeatedly do. Excellence is not an act but a habit.
          </Toast>

          <Toast icon={<AlertCircleIcon size={24} />} variant="error">
            We are what repeatedly do. Excellence is not an act but a habit. We
            are what repeatedly do. Excellence is not an act but a habit. We are
            what repeatedly do. Excellence is not an act but a habit.
          </Toast>

          <Toast variant="success" icon={<AlertCircleIcon size={24} />}>
            We are what repeatedly do. Excellence is not an act but a habit. We
            are what repeatedly do. Excellence is not an act but a habit. We are
            what repeatedly do. Excellence is not an act but a habit.
          </Toast>

          <Toast icon={<ImageIcon />}>Asset already exists</Toast>
        </StoryGrid>
      </StorySection>

      <StorySection title="Very long Toast">
        <StoryGrid>
          <Toast icon={<AlertCircleIcon size={24} />}>
            {"We are what repeatedly do. Excellence is not an act but a habit.".repeat(
              100
            )}
          </Toast>
        </StoryGrid>
      </StorySection>
    </>
  );
};
Design.storyName = "Toast Design";
