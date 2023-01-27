import {
  Box,
  Button,
  css,
  Flex,
  Label,
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverPortal,
  PopoverTrigger,
  rawTheme,
  Separator,
  Switch,
  TextField,
  theme,
  Tooltip,
  useId,
} from "@webstudio-is/design-system";
import { CopyIcon, InfoIcon, MenuIcon, PlusIcon } from "@webstudio-is/icons";
import { Fragment, type ComponentProps } from "react";

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
      <Tooltip content={info} variant="wrapped">
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
  onDelete: () => void;
};

const Menu = ({
  permission,
  name,
  onChangePermission,
  onChangeName,
  onDelete,
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
          <Button
            variant="destructive"
            onClick={() => {
              onDelete();
            }}
          >
            Delete Link
          </Button>
        </Item>
      </PopoverContent>
    </Popover>
  );
};

const itemStyle = css({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing[3],
  py: theme.spacing[5],
  px: theme.spacing[9],
});

type Permission = "view" | "edit" | "build";

export type LinkOptions = {
  url: string;
  name: string;
  permission: Permission;
};

type SharedLinkItemType = LinkOptions & {
  onChangePermission: (permission: Permission) => void;
  onChangeName: (name: string) => void;
  onDelete: () => void;
};

const SharedLinkItem = ({
  url,
  name,
  permission,
  onChangePermission,
  onChangeName,
  onDelete,
}: SharedLinkItemType) => {
  return (
    <Box className={itemStyle()}>
      <Label css={{ flexGrow: 1 }}>{name}</Label>
      <Button
        prefix={<CopyIcon />}
        onClick={() => {
          navigator.clipboard.writeText(url);
        }}
      >
        Copy link
      </Button>
      <Menu
        name={name}
        permission={permission}
        onChangePermission={onChangePermission}
        onChangeName={onChangeName}
        onDelete={onDelete}
      />
    </Box>
  );
};

type ShareProjectProps = {
  links?: Array<LinkOptions>;
  onChange: (link: LinkOptions) => void;
  onDelete: (link: LinkOptions) => void;
  onCreate: () => void;
  children: JSX.Element;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
};

export const ShareProject = ({
  links = [],
  onChange,
  onDelete,
  onCreate,
  children,
  isOpen,
  onOpenChange,
}: ShareProjectProps) => {
  const items = links.map((link) => (
    <Fragment key={link.url}>
      <SharedLinkItem
        key={link.url}
        {...link}
        onChangePermission={(permission) => {
          onChange({ ...link, permission });
        }}
        onChangeName={(name) => {
          onChange({ ...link, name });
        }}
        onDelete={() => {
          onDelete(link);
        }}
      />
      <Separator />
    </Fragment>
  ));

  const create = (
    <Box className={itemStyle({ css: { py: theme.spacing["9"] } })}>
      <Button
        variant="neutral"
        prefix={<PlusIcon />}
        onClick={() => {
          onCreate();
        }}
      >
        {links.length === 0 ? "Share a custom link" : "Add another link"}
      </Button>
    </Box>
  );

  // @todo this should use FloatingPanel instead of Popover, which we need to refactor first
  return (
    <Popover modal open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverPortal>
        <PopoverContent hideArrow>
          <Flex
            direction="column"
            css={{
              width: theme.spacing[33],
            }}
          >
            {items}
            {create}
          </Flex>
          <PopoverHeader title="Share" />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};
