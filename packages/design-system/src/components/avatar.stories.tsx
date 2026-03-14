import { Flex } from "./flex";
import { Avatar } from "./avatar";

export default {
  title: "Design System/Avatar",
  component: Avatar,
};

export const WithImage = () => (
  <Flex gap="3" align="center">
    <Avatar
      src="https://i.pravatar.cc/150?u=avatar1"
      alt="User avatar"
      fallback="JD"
    />
  </Flex>
);

export const WithFallback = () => (
  <Flex gap="3" align="center">
    <Avatar fallback="JD" />
    <Avatar fallback="AB" />
    <Avatar fallback="WS" />
  </Flex>
);
