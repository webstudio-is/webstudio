import { Button, Flex } from "@webstudio-is/design-system";
import { CopyToClipboard as CopyToClipboardComponent } from "./copy-to-clipboard";

export default {
  title: "Copy to clipboard",
  component: CopyToClipboardComponent,
};

export const CopyToClipboard = () => (
  <Flex gap="3">
    <CopyToClipboardComponent text="Hello, world!">
      <Button>Click to copy</Button>
    </CopyToClipboardComponent>
    <CopyToClipboardComponent
      text="some-secret-token-123"
      copyText="Copy token"
      copiedText="Token copied!"
    >
      <Button>Copy token</Button>
    </CopyToClipboardComponent>
  </Flex>
);
