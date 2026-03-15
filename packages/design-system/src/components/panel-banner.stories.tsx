import {
  PanelBanner as PanelBannerComponent,
  panelBannerIconColor,
} from "./panel-banner";
import { StoryGrid, StorySection } from "./storybook";
import { Text } from "./text";
import { Link } from "./link";
import { Flex } from "./flex";
import { buttonStyle } from "./button";
import {
  AlertIcon,
  InfoCircleIcon,
  CheckMarkIcon,
  AlertCircleIcon,
} from "@webstudio-is/icons";

export default {
  title: "Panel Banner",
};

export const PanelBanner = () => {
  return (
    <>
      <StorySection title="Panel Banner - Info (default)">
        <StoryGrid horizontal>
          <PanelBannerComponent css={{ width: 300 }}>
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
          </PanelBannerComponent>
        </StoryGrid>
      </StorySection>

      <StorySection title="Panel Banner - Variants with Icons">
        <StoryGrid horizontal>
          <PanelBannerComponent variant="info" css={{ width: 280 }}>
            <Flex align="center" gap={1}>
              <InfoCircleIcon color={panelBannerIconColor} />
              <Text variant="regularBold">Info</Text>
            </Flex>
            <Text variant="regular">This is an informational message.</Text>
          </PanelBannerComponent>
          <PanelBannerComponent variant="warning" css={{ width: 280 }}>
            <Flex align="center" gap={1}>
              <AlertIcon color={panelBannerIconColor} />
              <Text variant="regularBold">Warning</Text>
            </Flex>
            <Text variant="regular">This is a warning message.</Text>
          </PanelBannerComponent>
          <PanelBannerComponent variant="error" css={{ width: 280 }}>
            <Flex align="center" gap={1}>
              <AlertCircleIcon color={panelBannerIconColor} />
              <Text variant="regularBold">Error</Text>
            </Flex>
            <Text variant="regular">This is an error message.</Text>
          </PanelBannerComponent>
          <PanelBannerComponent variant="success" css={{ width: 280 }}>
            <Flex align="center" gap={1}>
              <CheckMarkIcon color={panelBannerIconColor} />
              <Text variant="regularBold">Success</Text>
            </Flex>
            <Text variant="regular">This is a success message.</Text>
          </PanelBannerComponent>
          <PanelBannerComponent variant="neutral" css={{ width: 280 }}>
            <Flex align="center" gap={1}>
              <InfoCircleIcon color={panelBannerIconColor} />
              <Text variant="regularBold">Neutral</Text>
            </Flex>
            <Text variant="regular">This is a neutral message.</Text>
          </PanelBannerComponent>
        </StoryGrid>
      </StorySection>

      <StorySection title="Compact banners">
        <StoryGrid horizontal>
          <PanelBannerComponent style={{ width: 280 }}>
            <Text variant="regular">
              Simple informational message without a heading.
            </Text>
          </PanelBannerComponent>
          <PanelBannerComponent variant="warning" style={{ width: 280 }}>
            <Text variant="regular">
              A brief warning message without icons or headings.
            </Text>
          </PanelBannerComponent>
          <PanelBannerComponent variant="error" style={{ width: 280 }}>
            <Text variant="regular">
              Something went wrong. Please try again.
            </Text>
          </PanelBannerComponent>
        </StoryGrid>
      </StorySection>
    </>
  );
};
