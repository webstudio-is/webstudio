import { Root } from "@webstudio-is/react-sdk";
import { Box, Button, Body } from "@webstudio-is/sdk-components-react";

export default function Index() {
  const Outlet = () => (
    <Body>
      <Box>
        <Button></Button>
      </Box>
    </Body>
  );
  return <Root Outlet={Outlet} />;
}
