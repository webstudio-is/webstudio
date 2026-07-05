import { useEffect, useRef, useState } from "react";
import { Box } from "@webstudio-is/design-system";
import { GenericFilePreview } from "./asset-thumbnail";

type Props = {
  src: string;
  ext: string;
  format: string;
};

export const LottieThumbnail = ({ src, ext, format }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let cancelled = false;

    import("lottie-web").then(({ default: lottie }) => {
      if (cancelled || !container.isConnected) {
        return;
      }

      const anim = lottie.loadAnimation({
        container,
        renderer: "svg",
        loop: false,
        autoplay: false,
        path: src,
      });

      anim.addEventListener("data_ready", () => {
        if (!cancelled) {
          anim.goToAndStop(0, true);
        }
      });

      anim.addEventListener("data_failed", () => {
        if (!cancelled) {
          setHasError(true);
        }
      });

      return () => {
        anim.destroy();
      };
    });

    return () => {
      cancelled = true;
      container.innerHTML = "";
    };
  }, [src]);

  if (hasError) {
    return <GenericFilePreview ext={ext} format={format} />;
  }

  return (
    <Box
      ref={containerRef}
      css={{
        position: "absolute",
        width: "100%",
        height: "100%",
        "& svg": {
          width: "100% !important",
          height: "100% !important",
        },
      }}
    />
  );
};
