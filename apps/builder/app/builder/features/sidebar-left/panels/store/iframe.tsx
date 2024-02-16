import { css } from "@webstudio-is/design-system";

const iframeStyle = css({
  border: "none",
  height: "100%",
});

export const Iframe = ({ src }: { src: string }) => {
  return <iframe className={iframeStyle()} src={src} />;
};
