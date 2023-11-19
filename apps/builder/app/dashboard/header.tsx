import { ChevronDownIcon, WebstudioIcon } from "@webstudio-is/icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  Flex,
  Avatar,
  css,
  rawTheme,
  theme,
  Button,
  Box,
  Text,
} from "@webstudio-is/design-system";
import { useNavigate } from "@remix-run/react";
import { logoutPath, userPlanSubscriptionPath } from "~/shared/router-utils";
import type { User } from "~/shared/db/user.server";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";

const containerStyle = css({
  px: theme.spacing[13],
  bc: theme.colors.backgroundPanel,
  height: theme.spacing[15],
  boxShadow: theme.shadows.brandElevationBig,
});

const getAvatarLetter = (title?: string) => {
  return (title || "X").charAt(0).toLocaleUpperCase();
};

const Menu = ({
  user,
  userPlanFeatures,
}: {
  user: User;
  userPlanFeatures: UserPlanFeatures;
}) => {
  const navigate = useNavigate();
  const title = user?.username ?? user?.email ?? undefined;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button color="ghost" aria-label="Menu Button" css={{ height: "100%" }}>
          <Flex gap="1" align="center">
            <Avatar
              src={user?.image || undefined}
              fallback={getAvatarLetter(title)}
              alt={title || "User Avatar"}
            />

            <ChevronDownIcon
              width={15}
              height={15}
              color={rawTheme.colors.foregroundMain}
            />
          </Flex>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{title}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => navigate(logoutPath())}>
          Logout
        </DropdownMenuItem>

        {userPlanFeatures.hasSubscription && (
          <DropdownMenuItem
            onSelect={() => navigate(userPlanSubscriptionPath())}
          >
            Subscriptions
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const Header = ({
  user,
  userPlanFeatures,
}: {
  user: User;
  userPlanFeatures: UserPlanFeatures;
}) => {
  return (
    <Flex
      as="header"
      align="center"
      justify="between"
      className={containerStyle()}
    >
      <WebstudioIcon width={30} height={23} />
      <Flex gap="1" align="center" css={{ position: "relative" }}>
        <Menu user={user} userPlanFeatures={userPlanFeatures} />
        {userPlanFeatures.hasProPlan && (
          <Flex
            css={{
              position: "absolute",
              left: theme.spacing[6],
              top: -4,
              width: 0,
            }}
            align={"center"}
            justify={"center"}
          >
            <Box
              css={{
                backgroundColor: theme.colors.primary,
                minWidth: "fit-content",
                py: theme.spacing[1],
                px: theme.spacing[3],
                borderRadius: theme.borderRadius[3],
                color: theme.colors.white,
              }}
            >
              <Text variant={"small"}>Pro</Text>
            </Box>
          </Flex>
        )}
      </Flex>
    </Flex>
  );
};
