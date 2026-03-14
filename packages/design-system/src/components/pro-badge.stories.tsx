import { Flex } from "./flex";
import { ProBadge } from "./pro-badge";

export default {
  title: "ProBadge",
  component: ProBadge,
};

export const Default = () => <ProBadge>Pro</ProBadge>;

export const CustomText = () => (
  <Flex gap="3" align="center">
    <ProBadge>Pro</ProBadge>
    <ProBadge>Enterprise</ProBadge>
    <ProBadge>Upgrade</ProBadge>
  </Flex>
);
