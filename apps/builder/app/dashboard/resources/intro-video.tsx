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
          src="https://www.youtube-nocookie.com/embed/videoseries?si=fk5L11IcnVErQRRS&list=PL4vVqpngzeT4Bfs_D25xNi_qNMY99R928&autoplay=true"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        />
      </DialogContent>
    </Dialog>
  );
};
