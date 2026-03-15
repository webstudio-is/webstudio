import {
  Dialog,
  DialogContent,
  Flex,
  StorySection,
} from "@webstudio-is/design-system";
import { About as AboutComponent } from "./about";
import type { MarketplaceOverviewItem } from "~/shared/marketplace/types";

export default {
  title: "Builder/Marketplace/About",
  component: AboutComponent,
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

export const About = () => (
  <StorySection title="About">
    <Flex direction="column" gap="5" css={{ width: 320 }}>
      <Dialog open>
        <DialogContent>
          <AboutComponent item={sampleItem} />
        </DialogContent>
      </Dialog>
    </Flex>
  </StorySection>
);
