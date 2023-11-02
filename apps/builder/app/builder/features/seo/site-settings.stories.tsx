import { $isSiteSettigsOpen } from "~/shared/nano-states/seo";
import { SiteSettings } from "./site-settings";

export default {
  component: SiteSettings,
};

$isSiteSettigsOpen.set(true);

export const SiteSettingsExample = () => {
  return <SiteSettings />;
};
