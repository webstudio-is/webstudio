import { TextArea } from "./text-area";
import { StorySection, StoryGrid } from "./storybook";
import { useState } from "react";

export default {
  title: "Library/Text Area",
};

const exampleValue =
  "This is an example value of a text area. It's long enough to show how it wraps.";

export const Demo = () => {
  const [value, setValue] = useState(exampleValue);

  return (
    <>
      <StorySection title="Empty">
        <StoryGrid css={{ width: 200 }}>
          <TextArea placeholder="Enter value..." />
        </StoryGrid>
      </StorySection>
      <StorySection title="With value">
        <StoryGrid css={{ width: 200 }}>
          <TextArea value={value} onChange={(value) => setValue(value)} />
        </StoryGrid>
      </StorySection>
      <StorySection title="Invalid">
        <StoryGrid css={{ width: 200 }}>
          <TextArea
            value={value}
            onChange={(value) => setValue(value)}
            state="invalid"
          />
        </StoryGrid>
      </StorySection>
      <StorySection title="Disabled">
        <StoryGrid css={{ width: 200 }}>
          <TextArea
            value={value}
            onChange={(value) => setValue(value)}
            disabled
          />
        </StoryGrid>
      </StorySection>
      <StorySection title="Disabled invalid">
        <StoryGrid css={{ width: 200 }}>
          <TextArea
            value={value}
            onChange={(value) => setValue(value)}
            state="invalid"
            disabled
          />
        </StoryGrid>
      </StorySection>
      <StorySection title="Focused (initialy)">
        <StoryGrid css={{ width: 200 }}>
          <TextArea
            value={value}
            onChange={(value) => setValue(value)}
            autoFocus
          />
        </StoryGrid>
      </StorySection>
      <StorySection title="Rows test">
        <StoryGrid css={{ width: 200 }}>
          <TextArea
            value={value}
            onChange={(value) => setValue(value)}
            rows={1}
          />
          <TextArea
            value={value}
            onChange={(value) => setValue(value)}
            rows={5}
          />
        </StoryGrid>
      </StorySection>
      <StorySection title="Width test">
        <StoryGrid css={{ width: 250 }}>
          <TextArea value={value} onChange={(value) => setValue(value)} />
        </StoryGrid>
      </StorySection>
    </>
  );
};
Demo.storyName = "Text Area";
