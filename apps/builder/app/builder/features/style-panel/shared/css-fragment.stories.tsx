import { useState } from "react";
import { StorySection, theme } from "@webstudio-is/design-system";
import { CssFragmentEditorContent } from "./css-fragment";

export default {
  title: "Style panel/CSS Fragment Editor",
  component: CssFragmentEditorContent,
};

const CssFragmentEditorStory = () => {
  const [value, setValue] = useState(
    "color: var(--foreground-primary);\nbackground: var(--background-primary);"
  );

  return (
    <StorySection title="CSS fragment editor">
      <CssFragmentEditorContent
        value={value}
        onChange={setValue}
        onChangeComplete={setValue}
        autoFocus
      />
    </StorySection>
  );
};

export const CSSFragmentEditor = () => (
  <div style={{ width: theme.sizes.sidebarWidth }}>
    <CssFragmentEditorStory />
  </div>
);
