import {
  Button,
  Flex,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  rawTheme,
  Separator,
  Switch,
  TextField,
  theme,
  Tooltip,
  useId,
} from "@webstudio-is/design-system";
import { CopyIcon, InfoIcon, MenuIcon } from "@webstudio-is/icons";
import { ComponentProps } from "react";

const Item = (props: ComponentProps<typeof Flex>) => (
  <Flex
    direction="column"
    css={{ padding: theme.spacing[7] }}
    gap="1"
    {...props}
  />
);

type PermissionProps = {
  title: string;
  name: string;
  defaultChecked?: boolean;
  info: string;
};
const Permission = ({ title, name, defaultChecked, info }: PermissionProps) => {
  const id = useId();

  return (
    <Flex align="center" gap="1">
      <Switch defaultChecked={defaultChecked} id={id} name={name} />
      <Label htmlFor={id}>{title}</Label>
      <Tooltip content={info} delayDuration={0} variant="wrapped">
        <InfoIcon color={rawTheme.colors.foregroundSubtle} tabIndex={0} />
      </Tooltip>
    </Flex>
  );
};

const Menu = () => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          prefix={<MenuIcon />}
          variant="ghost"
          aria-label="Menu Button for options"
        ></Button>
      </PopoverTrigger>
      <PopoverContent>
        <Item>
          <Label>Name</Label>
          <TextField defaultValue="Custom link" autoFocus />
        </Item>
        <Separator />
        <Item>
          <Label>Permissions</Label>
          <Permission
            defaultChecked
            title="View"
            name="view"
            info="Recipients can only view the site"
          />
          <Permission
            title="Edit Content"
            name="edit"
            info="Recipients can view the site and edit content like text and images, but they will not be able to change the styles or structure of your site."
          />
          <Permission
            title="Build"
            name="build"
            info="Recipients can view the site and edit content like text and images and change the styles or structure of your site."
          />
        </Item>
        <Separator />
        <Item>
          {/* @todo need a menu item that looks like one from dropdown but without DropdownMenu */}
          <Button variant="destructive">Delete Link</Button>
        </Item>
      </PopoverContent>
    </Popover>
  );
};

type SharedLinkItemType = {
  url: string;
  name: string;
};

const SharedLinkItem = ({ url, name }: SharedLinkItemType) => {
  return (
    <Flex
      align="center"
      gap="1"
      css={{ my: theme.spacing[5], mx: theme.spacing[9] }}
    >
      <Label css={{ flexGrow: 1 }}>{name}</Label>
      <Button prefix={<CopyIcon />}>Copy link</Button>
      <Menu />
    </Flex>
  );
};

type ShareProjectProps = {
  links: Array<SharedLinkItemType>;
};

export const ShareProject = ({ links }: ShareProjectProps) => {
  return (
    <Flex
      direction="column"
      css={{
        width: theme.spacing[33],
      }}
    >
      {links.map((link) => (
        <>
          <SharedLinkItem key={link.url} {...link} />
          <Separator />
        </>
      ))}
    </Flex>
  );
};
