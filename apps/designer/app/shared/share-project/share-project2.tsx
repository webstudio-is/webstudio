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
  info: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};
const Permission = ({
  title,
  info,
  checked,
  onCheckedChange,
}: PermissionProps) => {
  const id = useId();

  return (
    <Flex align="center" gap="1">
      <Switch checked={checked} id={id} onCheckedChange={onCheckedChange} />
      <Label htmlFor={id}>{title}</Label>
      <Tooltip content={info} delayDuration={0} variant="wrapped">
        <InfoIcon color={rawTheme.colors.foregroundSubtle} tabIndex={0} />
      </Tooltip>
    </Flex>
  );
};

type MenuProps = {
  permission: Permission;
  name: string;
  onChangePermission: (permission: Permission) => void;
  onChangeName: (name: string) => void;
};

const Menu = ({
  permission,
  name,
  onChangePermission,
  onChangeName,
}: MenuProps) => {
  const handleCheckedChange =
    (permission: Permission) => (checked: boolean) => {
      if (checked) {
        onChangePermission(permission);
      }
    };

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
          <TextField
            defaultValue="Custom link"
            autoFocus
            value={name}
            onChange={(event) => {
              onChangeName(event.target.value);
            }}
          />
        </Item>
        <Separator />
        <Item>
          <Label>Permissions</Label>
          <Permission
            checked={permission === "view"}
            onCheckedChange={handleCheckedChange("view")}
            title="View"
            info="Recipients can only view the site"
          />
          <Permission
            onCheckedChange={handleCheckedChange("edit")}
            checked={permission === "edit"}
            title="Edit Content"
            info="Recipients can view the site and edit content like text and images, but they will not be able to change the styles or structure of your site."
          />
          <Permission
            onCheckedChange={handleCheckedChange("build")}
            checked={permission === "build"}
            title="Build"
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

type Permission = "view" | "edit" | "build";

type LinkOptions = {
  url: string;
  name: string;
  permission: Permission;
};

type SharedLinkItemType = LinkOptions & {
  onChangePermission: (permission: Permission) => void;
  onChangeName: (name: string) => void;
};

const SharedLinkItem = ({
  url,
  name,
  permission,
  onChangePermission,
  onChangeName,
}: SharedLinkItemType) => {
  return (
    <Flex
      align="center"
      gap="1"
      css={{ my: theme.spacing[5], mx: theme.spacing[9] }}
    >
      <Label css={{ flexGrow: 1 }}>{name}</Label>
      <Button prefix={<CopyIcon />}>Copy link</Button>
      <Menu
        name={name}
        permission={permission}
        onChangePermission={onChangePermission}
        onChangeName={onChangeName}
      />
    </Flex>
  );
};

type ShareProjectProps = {
  links: Array<LinkOptions>;
  onChange: (link: LinkOptions) => void;
};

export const ShareProject = ({ links, onChange }: ShareProjectProps) => {
  return (
    <Flex
      direction="column"
      css={{
        width: theme.spacing[33],
      }}
    >
      {links.map((link) => (
        <>
          <SharedLinkItem
            key={link.url}
            {...link}
            onChangePermission={(permission) => {
              onChange({ ...link, permission });
            }}
            onChangeName={(name) => {
              onChange({ ...link, name });
            }}
          />
          <Separator />
        </>
      ))}
    </Flex>
  );
};
