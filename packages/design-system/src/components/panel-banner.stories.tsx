import { PanelBanner } from "./panel-banner";
import { StoryGrid, StorySection } from "./storybook";
import { Text } from "./text";
import { Link } from "./link";
import { buttonStyle } from "./button";

export default {
  title: "Library/Panel Banner",
};

export const Demo = () => {
  return (
    <>
      <StorySection title="Panel Banner">
        <StoryGrid horizontal>
          <PanelBanner css={{ width: 300 }}>
            <Text variant="regularBold">Free domains limit reached</Text>
            <Text variant="regular">
              You have reached the limit of 5 custom domains on your account.{" "}
              <Text variant="regularBold" inline>
                Upgrade to a Pro account
              </Text>{" "}
              to add unlimited domains.
            </Text>
            <Link
              className={buttonStyle({ color: "gradient" })}
              color="contrast"
              underline="none"
              href="https://webstudio.is/pricing"
              target="_blank"
            >
              Upgrade
            </Link>
          </PanelBanner>
        </StoryGrid>
      </StorySection>
    </>
  );
};

Demo.storyName = "Panel Banner";
