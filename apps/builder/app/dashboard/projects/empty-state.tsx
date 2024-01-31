import {
  Button,
  css,
  Dialog,
  DialogContent,
  DialogTrigger,
  Flex,
  Text,
} from "@webstudio-is/design-system";
import { Youtube1cIcon } from "@webstudio-is/icons";

const contentStyle = css({
  maxWidth: "none",
  width: "80vw",
  aspectRatio: "16/9",
});

const iframeStyle = css({
  width: "100%",
  height: "100%",
  border: 0,
});

export const EmptyState = () => (
  <Flex align="center" justify="center" direction="column" gap="6">
    <Text variant="brandMediumTitle" as="h1" align="center">
      What will you create?
    </Text>
    <Dialog>
      <DialogTrigger asChild>
        <Button color="gradient" prefix={<Youtube1cIcon size={16} />}>
          Watch The Intro
        </Button>
      </DialogTrigger>
      <DialogContent className={contentStyle()}>
        <iframe
          className={iframeStyle()}
          src="https://www.youtube-nocookie.com/embed/aL2sBSb3ghg?si=siExeIRt-YI_ypuA&autoplay=true"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        />
      </DialogContent>
    </Dialog>
  </Flex>
);
