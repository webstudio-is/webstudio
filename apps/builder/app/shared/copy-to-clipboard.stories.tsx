import { Button, Flex, StorySection } from "@webstudio-is/design-system";
import { CopyToClipboard as CopyToClipboardComponent } from "./copy-to-clipboard";

export default {
  title: "Copy To Clipboard",
  component: CopyToClipboardComponent,
};

export const CopyToClipboard = () => (
  <StorySection title="Copy To Clipboard">
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
  </StorySection>
);
