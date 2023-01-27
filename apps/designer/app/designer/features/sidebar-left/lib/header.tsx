import {
  Button,
  Tooltip,
  Separator,
  Title,
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
      <Title suffix={suffix}>{title}</Title>
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
