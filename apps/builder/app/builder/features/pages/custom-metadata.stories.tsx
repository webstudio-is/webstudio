import { Box, StorySection } from "@webstudio-is/design-system";
import { CustomMetadata as CustomMetadataComponent } from "./custom-metadata";
import { useState } from "react";

export default {
  component: CustomMetadataComponent,
  title: "Pages/Custom Metadata",
};

export const CustomMetadata = () => {
  const [customMetas, setCustomMetas] = useState([
    {
      property: "og:title",
      content: "My title",
    },
  ]);

  return (
    <StorySection title="Custom Metadata">
      <Box css={{ width: 448, margin: 20 }}>
        <CustomMetadataComponent
          customMetas={customMetas}
          onChange={setCustomMetas}
        />
      </Box>
    </StorySection>
  );
};
