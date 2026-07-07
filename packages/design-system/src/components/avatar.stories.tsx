import { Flex } from "./flex";
import { Avatar as AvatarComponent } from "./avatar";
import { StorySection } from "./storybook";

export default {
  title: "Avatar",
  component: AvatarComponent,
};

const avatarImage = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150">
    <rect width="150" height="150" fill="#7c8a99"/>
    <text x="75" y="75" text-anchor="middle" dominant-baseline="central"
      font-family="sans-serif" font-size="48" fill="#fff">JD</text>
  </svg>`
)}`;

export const Avatar = () => (
  <>
    <StorySection title="With image and fallback">
      <Flex gap="3" align="center">
        <AvatarComponent src={avatarImage} alt="User avatar" fallback="JD" />
        <AvatarComponent fallback="JD" />
        <AvatarComponent fallback="AB" />
        <AvatarComponent fallback="WS" />
      </Flex>
    </StorySection>

    <StorySection title="Fallback variants">
      <Flex gap="3" align="center">
        <AvatarComponent fallback="A" />
        <AvatarComponent fallback="JD" />
        <AvatarComponent fallback="WEB" />
      </Flex>
    </StorySection>

    <StorySection title="Broken image">
      <Flex gap="3" align="center">
        <AvatarComponent
          src="https://broken-url.invalid/avatar.png"
          fallback="FB"
          alt="Broken image avatar"
        />
        <AvatarComponent fallback="OK" alt="No image avatar" />
      </Flex>
    </StorySection>
  </>
);
