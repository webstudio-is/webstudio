import { useEffect, useRef, useState } from "react";
import { Box, styled } from "~/shared/design-system";
import { Image as BaseImage } from "~/shared/design-system/components/image";

const ImageWrapper = styled(Box, {
  paddingTop: "100%",
  backgroundSize: "contain",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  position: "relative",
  aspectRatio: "1/1",
});

const StyledImage = styled(BaseImage, {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%) translateX(-50%)",
  left: "50%",
});

export const SingleImage = ({ path, alt }: { path: string; alt: string? }) => {
  const images = {
    current: path,
    placeholder: "/assets/images/image_place_holder.svg",
    error: "/assets/images/broken_image_place_holder.svg",
  };
  const [imageSrc, setImageSrc] = useState(images.placeholder);

  useEffect(() => {
    const newImage = new Image();
    newImage.src = path;

    newImage.onload = () => setImageSrc(path);
    newImage.onerror = () => setImageSrc(images.error);
  }, [images.error, path]);

  return (
    <ImageWrapper>
      <StyledImage src={imageSrc}></StyledImage>
    </ImageWrapper>
  );
};
