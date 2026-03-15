import { Button, Flex } from "@webstudio-is/design-system";
import { CopyToClipboard } from "./copy-to-clipboard";

export default {
  title: "Copy To Clipboard",
  component: CopyToClipboard,
};

export const CopyToClipboard = () => (
  <Flex gap="3">
    <CopyToClipboard text="Hello, world!">
      <Button>Click to copy</Button>
    </CopyToClipboard>
    <CopyToClipboard
      text="some-secret-token-123"
      copyText="Copy token"
      copiedText="Token copied!"
    >
      <Button>Copy token</Button>
    </CopyToClipboard>
  </Flex>
);
