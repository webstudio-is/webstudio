import { InfoTooltip } from "./info-tooltip";
import { TooltipProvider } from "./tooltip";
import { Link } from "./link";

export default { title: "Info Tooltip" };

export const Default = () => (
  <TooltipProvider>
    <InfoTooltip
      label="About this field"
      content={
        <>
          Learn more in the <Link href="https://webstudio.is">guide</Link>.
        </>
      }
    />
  </TooltipProvider>
);
