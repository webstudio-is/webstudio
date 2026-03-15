import { Flex } from "./flex";
import { ProBadge as ProBadgeComponent } from "./pro-badge";

export default {
  title: "ProBadge",
  component: ProBadgeComponent,
};

export const ProBadge = () => (
  <Flex gap="3" align="center">
    <ProBadgeComponent>Pro</ProBadgeComponent>
    <ProBadgeComponent>Enterprise</ProBadgeComponent>
    <ProBadgeComponent>Upgrade</ProBadgeComponent>
  </Flex>
);
