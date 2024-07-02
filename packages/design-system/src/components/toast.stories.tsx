import { Toast, Toaster, toast } from "./toast";
import { StorySection, StoryGrid } from "./storybook";
import { Button } from "./button";
export default {
  title: "Library/Toast",
};

export const Design = () => {
  return (
    <StorySection title="Desing">
      <StoryGrid>
        <Toast>
          We are what repeatedly do. Excellence is not an act but a habit.
        </Toast>

        <Toast variant="warning">
          We are what repeatedly do. Excellence is not an act but a habit.
        </Toast>

        <Toast variant="error">
          We are what repeatedly do. Excellence is not an act but a habit. We
          are what repeatedly do. Excellence is not an act but a habit. We are
          what repeatedly do. Excellence is not an act but a habit.
        </Toast>
      </StoryGrid>
    </StorySection>
  );
};
Design.storyName = "Toast Design";

export const InAction = () => {
  return (
    <StorySection title="Action">
      <StoryGrid css={{ width: 300 }}>
        <Toaster />
        <Button
          onClick={() => {
            toast.error("Hello World", { duration: 5000 });
          }}
        >
          Show Error Toast
        </Button>
      </StoryGrid>
    </StorySection>
  );
};
