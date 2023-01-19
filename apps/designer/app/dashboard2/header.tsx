import { ChevronDownIcon, WebstudioIcon } from "@webstudio-is/icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DeprecatedButton,
  Text,
  Flex,
  Avatar,
  css,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import { User as DbUser } from "@webstudio-is/prisma-client";
import { useNavigate } from "react-router-dom";
import { logoutPath } from "~/shared/router-utils";

const containerStyle = css({
  px: theme.spacing[13],
  bc: theme.colors.backgroundPanel,
  borderBottom: `${theme.spacing[1]} solid ${theme.colors.slate8}`,
  height: theme.spacing[17],
});

const getAvatarLetter = (user: User) => {
  return (user?.username || user?.email || "X").charAt(0).toLocaleUpperCase();
};

type User = Omit<DbUser, "createdAt"> & {
  createdAt: string;
};

export const Header = ({ user }: { user: User }) => {
  const navigate = useNavigate();

  return (
    <Flex
      as="header"
      align="center"
      justify="between"
      className={containerStyle()}
    >
      <WebstudioIcon width={30} height={23} />
      <Flex gap="1" align="center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <DeprecatedButton variant="raw" aria-label="Menu Button">
              <Flex gap="1" align="center" css={{ height: theme.spacing[11] }}>
                <Avatar
                  src={user?.image || undefined}
                  fallback={getAvatarLetter(user)}
                />
                <ChevronDownIcon
                  width={15}
                  height={15}
                  color={rawTheme.colors.foregroundMain}
                />
              </Flex>
            </DeprecatedButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => navigate(logoutPath())}>
              <Text>Logout</Text>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Flex>
    </Flex>
  );
};
