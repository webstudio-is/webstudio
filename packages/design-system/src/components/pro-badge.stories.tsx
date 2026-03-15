import { Flex } from "./flex";
import { ProBadge as ProBadgeComponent } from "./pro-badge";

export default {
  title: "Pro badge",
  component: ProBadgeComponent,
};

export const ProBadge = () => (
  <Flex gap="3" align="center">
    <ProBadgeComponent>Pro</ProBadgeComponent>
    <ProBadgeComponent>Enterprise</ProBadgeComponent>
    <ProBadgeComponent>Upgrade</ProBadgeComponent>
  </Flex>
);

export const ProBadgeTruncated = () => (
  <Flex direction="column" gap="3" style={{ width: 80 }}>
    <ProBadgeComponent>Very long enterprise plan name</ProBadgeComponent>
    <ProBadgeComponent>Short</ProBadgeComponent>
  </Flex>
);
