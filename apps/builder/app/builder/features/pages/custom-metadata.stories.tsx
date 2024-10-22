import { Box } from "@webstudio-is/design-system";
import { CustomMetadata } from "./custom-metadata";
import { useState } from "react";

export default { component: CustomMetadata, title: "Pages/CustomMetadata" };

export const Basic = () => {
  const [customMetas, setCustomMetas] = useState([
    {
      property: "og:title",
      content: "My title",
    },
  ]);

  return (
    <Box css={{ width: 448, margin: 20 }}>
      <CustomMetadata customMetas={customMetas} onChange={setCustomMetas} />
    </Box>
  );
};
