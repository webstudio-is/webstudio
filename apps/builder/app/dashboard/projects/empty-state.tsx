import {
  Button,
  css,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  Flex,
  Text,
  theme,
} from "@webstudio-is/design-system";
import type { ComponentProps } from "react";
import { Youtube1cIcon } from "@webstudio-is/icons";

const containerStyle = css({
  borderRadius: theme.borderRadius[4],
  height: theme.spacing[29],
  minWidth: 600,
});

const EmptyStateContainer = (props: ComponentProps<typeof Flex>) => (
  <Flex
    align="center"
    justify="center"
    direction="column"
    gap="6"
    className={containerStyle()}
    {...props}
  />
);

export const EmptyState = () => (
  <EmptyStateContainer>
    <Text variant="brandMediumTitle" as="h1">
      What will you create?
    </Text>

    <Dialog>
      <DialogTrigger asChild>
        <Button color="gradient" prefix={<Youtube1cIcon size={16} />}>
          Watch The Intro
        </Button>
      </DialogTrigger>
      <DialogContent
        css={{ maxWidth: "none", width: "80vw", aspectRatio: "16/9" }}
      >
        <iframe
          width="100%"
          height="100%"
          src="https://www.youtube-nocookie.com/embed/aL2sBSb3ghg?si=siExeIRt-YI_ypuA&autoplay=true"
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
        <DialogTitle>Intro</DialogTitle>
      </DialogContent>
    </Dialog>
  </EmptyStateContainer>
);
