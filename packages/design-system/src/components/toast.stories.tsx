import { Toast as ToastComponent } from "./toast";
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

export const Toast = () => {
  return (
    <>
      <StorySection title="Toast Design">
        <StoryGrid>
          <ToastComponent>1. We are what repeatedly do.</ToastComponent>

          <ToastComponent>
            2. We are what repeatedly do. Excellence is not an act but a habit.
          </ToastComponent>

          <ToastComponent>
            3. We are what repeatedly do. We are what repeatedly do. Excellence
            is not an act but a habit.
          </ToastComponent>

          <ToastComponent>
            3. We are what repeatedly do. We are what repeatedly do. Excellence
            is not an act but a habit. We are what
          </ToastComponent>

          <ToastComponent>
            4. We are what repeatedly do. We are what repeatedly do. We are what
            repeatedly do. Excellence is not an act but a habit.
          </ToastComponent>

          <ToastComponent>
            5. We are what repeatedly do. We are what repeatedly do. We are what
            repeatedly do. We are what repeatedly do. Excellence is not an act
            but a habit.
          </ToastComponent>

          <ToastComponent>
            6. We are what repeatedly do. We are what repeatedly do. We are what
            repeatedly do. We are what repeatedly do. We are what repeatedly do.
            Excellence is not an act but a habit.
          </ToastComponent>

          <ToastComponent variant="warning">
            We are what repeatedly do. Excellence is not an act but a habit.
          </ToastComponent>

          <ToastComponent variant="error">
            We are what repeatedly do. Excellence is not an act but a habit. We
            are what repeatedly do. Excellence is not an act but a habit. We are
            what repeatedly do. Excellence is not an act but a habit.
          </ToastComponent>
          <ToastComponent variant="success">
            We are what repeatedly do. Excellence is not an act but a habit. We
            are what repeatedly do. Excellence is not an act but a habit. We are
            what repeatedly do. Excellence is not an act but a habit.
          </ToastComponent>
        </StoryGrid>
      </StorySection>

      <StorySection title="Toast With Icon Design">
        <StoryGrid>
          <ToastComponent icon={<AlertCircleIcon size={24} />}>
            We are what repeatedly do. Excellence is not an act but a habit.
          </ToastComponent>

          <ToastComponent
            icon={<AlertCircleIcon size={24} />}
            variant="warning"
          >
            We are what repeatedly do. Excellence is not an act but a habit.
          </ToastComponent>

          <ToastComponent icon={<AlertCircleIcon size={24} />} variant="error">
            We are what repeatedly do. Excellence is not an act but a habit. We
            are what repeatedly do. Excellence is not an act but a habit. We are
            what repeatedly do. Excellence is not an act but a habit.
          </ToastComponent>

          <ToastComponent
            variant="success"
            icon={<AlertCircleIcon size={24} />}
          >
            We are what repeatedly do. Excellence is not an act but a habit. We
            are what repeatedly do. Excellence is not an act but a habit. We are
            what repeatedly do. Excellence is not an act but a habit.
          </ToastComponent>

          <ToastComponent icon={<ImageIcon />}>
            Asset already exists
          </ToastComponent>
        </StoryGrid>
      </StorySection>

      <StorySection title="Very long Toast">
        <StoryGrid>
          <ToastComponent icon={<AlertCircleIcon size={24} />}>
            {"We are what repeatedly do. Excellence is not an act but a habit.".repeat(
              100
            )}
          </ToastComponent>
        </StoryGrid>
      </StorySection>

      <StorySection title="With close and copy actions">
        <StoryGrid>
          <ToastComponent
            onClose={() => window.alert("Close clicked")}
            onCopy={() => window.alert("Copy clicked")}
          >
            Toast with close and copy actions
          </ToastComponent>
          <ToastComponent
            variant="error"
            icon={<AlertCircleIcon size={24} />}
            onClose={() => window.alert("Close clicked")}
            onCopy={() => window.alert("Copy clicked")}
          >
            Error toast with actions
          </ToastComponent>
        </StoryGrid>
      </StorySection>
    </>
  );
};
