import { TextArea } from "./text-area";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Library/Text Area",
};

const exampleValue =
  "This is an example value of a text area. It's long enough to show how it wraps.";

export const Demo = () => {
  return (
    <>
      <StorySection title="Empty">
        <StoryGrid css={{ width: 200 }}>
          <TextArea placeholder="Enter value..." />
        </StoryGrid>
      </StorySection>
      <StorySection title="With value">
        <StoryGrid css={{ width: 200 }}>
          <TextArea value={exampleValue} />
        </StoryGrid>
      </StorySection>
      <StorySection title="Invalid">
        <StoryGrid css={{ width: 200 }}>
          <TextArea value={exampleValue} state="invalid" />
        </StoryGrid>
      </StorySection>
      <StorySection title="Disabled">
        <StoryGrid css={{ width: 200 }}>
          <TextArea value={exampleValue} disabled />
        </StoryGrid>
      </StorySection>
      <StorySection title="Disabled invalid">
        <StoryGrid css={{ width: 200 }}>
          <TextArea value={exampleValue} state="invalid" disabled />
        </StoryGrid>
      </StorySection>
      <StorySection title="Focused (initialy)">
        <StoryGrid css={{ width: 200 }}>
          <TextArea value={exampleValue} autoFocus />
        </StoryGrid>
      </StorySection>
      <StorySection title="Rows test">
        <StoryGrid css={{ width: 200 }}>
          <TextArea value={exampleValue} rows={1} />
        </StoryGrid>
      </StorySection>
      <StorySection title="Width test">
        <TextArea value={exampleValue} css={{ width: "250px" }} />
      </StorySection>
    </>
  );
};
Demo.storyName = "Text Area";
