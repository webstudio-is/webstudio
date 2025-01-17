import { ChevronDownIcon, UpgradeIcon } from "@webstudio-is/icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuItem,
  DropdownMenuLabel,
  Flex,
  Avatar,
  rawTheme,
  theme,
  Button,
  ProBadge,
  DropdownMenuSeparator,
  Text,
} from "@webstudio-is/design-system";
import { useNavigate } from "@remix-run/react";
import { logoutPath, userPlanSubscriptionPath } from "~/shared/router-utils";
import type { User } from "~/shared/db/user.server";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";

const getAvatarLetter = (title?: string) => {
  return (title || "X").charAt(0).toLocaleUpperCase();
};

const defaultUserName = "James Bond";

export const ProfileMenu = ({
  user,
  userPlanFeatures,
}: {
  user: User;
  userPlanFeatures: UserPlanFeatures;
}) => {
  const navigate = useNavigate();
  const nameOrEmail = user.username ?? user.email ?? defaultUserName;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button color="ghost" aria-label="Menu Button">
          <Flex gap="1" align="center">
            <Avatar
              src={user?.image || undefined}
              fallback={getAvatarLetter(nameOrEmail)}
              alt={nameOrEmail}
            />
            {userPlanFeatures.hasProPlan && (
              <>
                <ProBadge>{userPlanFeatures.planName}</ProBadge>
                <div />
              </>
            )}

            <ChevronDownIcon size={12} />
          </Flex>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            {user.username ?? defaultUserName}
            <Text>{user.email}</Text>
          </DropdownMenuLabel>
          {userPlanFeatures.hasSubscription && (
            <DropdownMenuItem
              onSelect={() => navigate(userPlanSubscriptionPath())}
            >
              Manage Subscription
            </DropdownMenuItem>
          )}
          {userPlanFeatures.hasProPlan === false && (
            <DropdownMenuItem
              onSelect={() => {
                window.open("https://webstudio.is/pricing");
              }}
              css={{
                gap: theme.spacing[3],
              }}
            >
              <UpgradeIcon />
              <div>Upgrade to Pro</div>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate(logoutPath())}>
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};
