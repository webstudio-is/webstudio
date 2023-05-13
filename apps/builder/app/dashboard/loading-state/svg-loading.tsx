import { css } from "@webstudio-is/design-system";
import svgSpinner from "./spinner";

const svgContainerStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const SvgLoading = ({ size = 64 }: { size?: number }) => {
  return (
    <div
      className={svgContainerStyle()}
      style={{ height: size, width: size }}
      dangerouslySetInnerHTML={{ __html: svgSpinner }}
    ></div>
  );
};
