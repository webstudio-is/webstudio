import {
  Flex,
  Text,
  Button,
  SmallIconButton,
} from "@webstudio-is/design-system";
import { DotIcon, ExternalLinkIcon } from "@webstudio-is/icons";
import { CollapsibleDomainSection } from "./collapsible-domain-section";

export default {
  title: "Builder/Publish/Collapsible Domain Section",
  component: CollapsibleDomainSection,
};

export const Demo = () => (
  <Flex direction="column" gap="3" css={{ width: 320 }}>
    <CollapsibleDomainSection
      title="example.com"
      prefix={<DotIcon />}
      suffix={<SmallIconButton icon={<ExternalLinkIcon />} aria-label="Open" />}
      initiallyOpen
    >
      <Text>DNS records and status go here.</Text>
      <Button color="neutral">Verify DNS</Button>
    </CollapsibleDomainSection>

    <CollapsibleDomainSection
      title="staging.example.com"
      prefix={<DotIcon />}
      suffix={<SmallIconButton icon={<ExternalLinkIcon />} aria-label="Open" />}
    >
      <Text>This section is collapsed by default.</Text>
    </CollapsibleDomainSection>
  </Flex>
);
