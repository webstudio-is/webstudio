import { Flex } from "@webstudio-is/design-system";
import { ThumbnailWithAbbr, ThumbnailLinkWithAbbr } from "./thumbnail";

export default {
  title: "Dashboard/Thumbnail",
};

export const Thumbnail = () => (
  <Flex gap="3">
    <ThumbnailWithAbbr title="My Next Project" onClick={() => {}} />
    <ThumbnailLinkWithAbbr title="Landing Page" to="#" />
    <ThumbnailWithAbbr title="Portfolio" onClick={() => {}} />
  </Flex>
);
