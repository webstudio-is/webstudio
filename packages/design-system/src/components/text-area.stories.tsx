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
      <StorySection title="Uncontrollable">
        <StoryGrid css={{ width: 200 }}>
          <TextArea placeholder="Enter value..." />
        </StoryGrid>
      </StorySection>

      <StorySection title="No AutoGrow, rows=3 (Manual resize only, no height limit)">
        <StoryGrid css={{ width: 200 }}>
          <TextArea value={value} onChange={setValue} />
        </StoryGrid>
      </StorySection>

      <StorySection title="No AutoGrow, rows=3, maxRows=6 (Manual resize up to 6 rows)">
        <StoryGrid css={{ width: 200 }}>
          <TextArea value={value} onChange={setValue} maxRows={6} />
        </StoryGrid>
      </StorySection>

      <StorySection title="AutoGrow, no max (Auto-resize with no height limit.)">
        <StoryGrid css={{ width: 200 }}>
          <TextArea value={value} onChange={setValue} autoGrow />
        </StoryGrid>
      </StorySection>

      <StorySection title="AutoGrow, maxRows=10 (Auto-resize up to 10 rows.)">
        <StoryGrid css={{ width: 200 }}>
          <TextArea value={value} onChange={setValue} autoGrow maxRows={10} />
        </StoryGrid>
      </StorySection>

      <StorySection title="With value">
        <StoryGrid css={{ width: 200 }}>
          <TextArea value={value} onChange={setValue} />
        </StoryGrid>
      </StorySection>
      <StorySection title="Error">
        <StoryGrid css={{ width: 200 }}>
          <TextArea value={value} onChange={setValue} color="error" />
        </StoryGrid>
      </StorySection>
      <StorySection title="Disabled">
        <StoryGrid css={{ width: 200 }}>
          <TextArea value={value} onChange={setValue} disabled />
        </StoryGrid>
      </StorySection>
      <StorySection title="Disabled error">
        <StoryGrid css={{ width: 200 }}>
          <TextArea value={value} onChange={setValue} color="error" disabled />
        </StoryGrid>
      </StorySection>
      <StorySection title="Focused (initialy)">
        <StoryGrid css={{ width: 200 }}>
          <TextArea value={value} onChange={setValue} autoFocus />
        </StoryGrid>
      </StorySection>
      <StorySection title="Rows test">
        <StoryGrid css={{ width: 200 }}>
          <TextArea value={value} onChange={setValue} rows={1} />
          <TextArea value={value} onChange={setValue} rows={5} />
        </StoryGrid>
      </StorySection>
      <StorySection title="Width test">
        <StoryGrid css={{ width: 250 }}>
          <TextArea value={value} onChange={setValue} />
        </StoryGrid>
      </StorySection>
      <StorySection title="Mono">
        <StoryGrid css={{ width: 250 }}>
          <TextArea variant="mono" value={value} onChange={setValue} />
        </StoryGrid>
      </StorySection>
    </>
  );
};
Demo.storyName = "Text Area";
