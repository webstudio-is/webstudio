import {
  Button,
  Flex,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Switch,
  TextField,
  theme,
  useId,
} from "@webstudio-is/design-system";
import { CopyIcon, MenuIcon } from "@webstudio-is/icons";
import { ComponentProps } from "react";

const Item = (props: ComponentProps<typeof Flex>) => (
  <Flex
    direction="column"
    css={{ padding: theme.spacing[7] }}
    gap="1"
    {...props}
  />
);

const Menu = () => {
  const viewId = useId();
  const editId = useId();
  const buildId = useId();
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
          <Flex align="center" gap="2">
            <Switch defaultChecked id={viewId} />
            <Label htmlFor={viewId}>View</Label>
          </Flex>
          <Flex align="center" gap="2">
            <Switch id={editId} />
            <Label htmlFor={editId}>Edit Content</Label>
          </Flex>
          <Flex align="center" gap="2">
            <Switch id={buildId} />
            <Label htmlFor={buildId}>Build</Label>
          </Flex>
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
