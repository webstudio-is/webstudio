import { ChevronDownIcon } from "@radix-ui/react-icons";
import { Avatar } from "~/shared/design-system/components/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Button,
  Text,
  Flex,
} from "~/shared/design-system";
import { User } from "@webstudio-is/prisma-client";
import { useNavigate } from "react-router-dom";

export const DashboardHeader = ({ user }: { user: User }) => {
  const navigate = useNavigate();
  const userNameFallback = (user?.username || user?.email || "X")
    .charAt(0)
    .toLocaleUpperCase();

  return (
    <Flex
      as="header"
      align="center"
      justify="end"
      css={{
        p: "$1",
        bc: "$loContrast",
        borderBottom: "1px solid $slate8",
      }}
    >
      <Flex gap="1" align="center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="raw" aria-label="Menu Button">
              <Flex gap="1" align="center" css={{ height: "$5" }}>
                <Avatar
                  src={user?.image || undefined}
                  fallback={userNameFallback}
                />

                <ChevronDownIcon width={15} height={15} color="white" />
              </Flex>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => navigate("/logout")}>
              <Text>Logout</Text>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Flex>
    </Flex>
  );
};
