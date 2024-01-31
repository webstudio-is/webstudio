import type { ReactNode } from "react";
import {
  css,
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@webstudio-is/design-system";

const iframeStyle = css({
  width: "100%",
  height: "100%",
  border: 0,
});

export const IntroVideoDialog = ({
  children,
  asChild,
}: {
  children: ReactNode;
  asChild?: boolean;
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild={asChild}>{children}</DialogTrigger>
      <DialogContent
        css={{
          maxWidth: "none",
          width: "80vw",
          aspectRatio: "16/9",
        }}
      >
        <iframe
          className={iframeStyle()}
          src="https://www.youtube-nocookie.com/embed/aL2sBSb3ghg?si=siExeIRt-YI_ypuA&autoplay=true"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        />
      </DialogContent>
    </Dialog>
  );
};
