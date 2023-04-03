import {
  Button,
  Tooltip,
  Separator,
  PanelTitle,
  TitleSuffixSpacer,
} from "@webstudio-is/design-system";
import { CrossIcon } from "@webstudio-is/icons";

type HeaderProps = {
  title: string;
  suffix: React.ReactNode;
};

export const Header = ({ title, suffix }: HeaderProps) => {
  return (
    <>
      <PanelTitle suffix={suffix}>{title}</PanelTitle>
      <Separator />
    </>
  );
};

export { TitleSuffixSpacer as HeaderSuffixSpacer };

export const CloseButton = ({
  onClick,
  label = "Close panel",
}: {
  onClick: () => void;
  label?: string;
}) => (
  <Tooltip content={label} side="bottom">
    <Button
      onClick={onClick}
      color="ghost"
      prefix={<CrossIcon />}
      aria-label={label}
    />
  </Tooltip>
);
