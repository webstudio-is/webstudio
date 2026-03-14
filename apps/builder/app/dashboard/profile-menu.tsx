import { forwardRef } from "react";
import { ChevronDownIcon, UpgradeIcon } from "@webstudio-is/icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  Avatar,
  theme,
  Button,
  ProBadge,
  DropdownMenuSeparator,
  Text,
} from "@webstudio-is/design-system";
import { useNavigate } from "@remix-run/react";
import { logoutPath, userPlanSubscriptionPath } from "~/shared/router-utils";
import type { User } from "~/shared/db/user.server";
import type { getPermissions } from "~/shared/permissions";

const getAvatarLetter = (title?: string) => {
  return (title || "X").charAt(0).toLocaleUpperCase();
};

const defaultUserName = "James Bond";

const ProfileButton = forwardRef<
  HTMLButtonElement,
  {
    name: string;
    image?: string;
    hasPurchases?: boolean;
  }
>(({ image, name, hasPurchases, ...rest }, forwardedRef) => {
  return (
    <Button
      color="ghost"
      aria-label="Profile Menu"
      {...rest}
      ref={forwardedRef}
      prefix={
        <Avatar src={image} fallback={getAvatarLetter(name)} alt={name} />
      }
      suffix={<ChevronDownIcon size={12} />}
      css={{
        // Exception for avatar. May need to introduce a 32px controls size later.
        height: theme.spacing[13],
      }}
    >
      {hasPurchases === false && <ProBadge>Free</ProBadge>}
    </Button>
  );
});

export const ProfileMenu = ({
  user,
  permissions,
}: {
  user: User;
  permissions: ReturnType<typeof getPermissions>;
}) => {
  const navigate = useNavigate();
  const nameOrEmail = user.username ?? user.email ?? defaultUserName;
  const { purchases } = permissions;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ProfileButton
          image={user.image || undefined}
          name={nameOrEmail}
          hasPurchases={purchases.length > 0}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" width="regular">
        <DropdownMenuLabel>
          {user.username ?? defaultUserName}
          <Text>{user.email}</Text>
        </DropdownMenuLabel>
        {purchases.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Purchases</DropdownMenuLabel>
          </>
        )}
        {purchases.map((purchase, index) =>
          purchase.subscriptionId ? (
            <DropdownMenuItem
              key={purchase.subscriptionId}
              onSelect={() => {
                window.location.href = userPlanSubscriptionPath(
                  purchase.subscriptionId
                );
              }}
            >
              {purchase.planName}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuLabel key={index}>
              {purchase.planName}
            </DropdownMenuLabel>
          )
        )}
        {purchases.length === 0 && (
          <DropdownMenuItem
            onSelect={() => {
              window.open("https://webstudio.is/pricing");
            }}
            css={{ gap: theme.spacing[3] }}
          >
            <UpgradeIcon />
            <div>Upgrade</div>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate(logoutPath())}>
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
