import { Flex } from "./flex";
import { Avatar } from "./avatar";

export default {
  title: "Avatar",
  component: Avatar,
};

const avatarImage = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150">
    <rect width="150" height="150" fill="#7c8a99"/>
    <text x="75" y="75" text-anchor="middle" dominant-baseline="central"
      font-family="sans-serif" font-size="48" fill="#fff">JD</text>
  </svg>`
)}`;

export const Avatar = () => (
  <Flex gap="3" align="center">
    <Avatar src={avatarImage} alt="User avatar" fallback="JD" />
    <Avatar fallback="JD" />
    <Avatar fallback="AB" />
    <Avatar fallback="WS" />
  </Flex>
);
