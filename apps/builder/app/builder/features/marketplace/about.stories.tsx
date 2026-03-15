import { Flex } from "@webstudio-is/design-system";
import { About } from "./about";
import type { MarketplaceOverviewItem } from "~/shared/marketplace/types";

export default {
  title: "Builder/Marketplace/About",
  component: About,
};

const sampleItem: MarketplaceOverviewItem = {
  projectId: "project-123",
  authorizationToken: "token-abc",
  category: "sectionTemplates",
  name: "Hero section",
  thumbnailAssetId: "asset-1",
  author: "Webstudio team",
  email: "hello@webstudio.is",
  website: "https://webstudio.is",
  issues: "https://github.com/webstudio-is/webstudio/issues",
  description:
    "A versatile hero section template with a large heading, subheading, and a call-to-action button.",
};

const minimalItem: MarketplaceOverviewItem = {
  projectId: "project-456",
  category: "pageTemplates",
  name: "Minimal page",
  thumbnailAssetId: "asset-2",
  author: "Community author",
  email: "author@example.com",
  website: "",
  issues: "",
  description: "A simple page template with minimal styling.",
};

export const Demo = () => (
  <Flex direction="column" gap="5" css={{ width: 320 }}>
    <About item={sampleItem} />
    <About item={minimalItem} />
    <About item={undefined} />
  </Flex>
);
