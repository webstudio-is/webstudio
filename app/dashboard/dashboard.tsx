import { useState } from "react";
import { Form, useActionData, useTransition } from "@remix-run/react";
import { useNavigate } from "react-router-dom";
import * as Avatar from "@radix-ui/react-avatar";

import {
  Flex,
  Card,
  Select,
  TextField,
  Button,
  Heading,
  Text,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  styled,
} from "~/shared/design-system";
import interStyles from "~/shared/font-faces/inter.css";
import dashboardStyles from "./dashboard.css";
import { User } from "@prisma/client";
import { ChevronDownIcon } from "@radix-ui/react-icons";

export const links = () => {
  return [
    {
      rel: "stylesheet",
      href: interStyles,
    },
    {
      rel: "stylesheet",
      href: dashboardStyles,
    },
  ];
};

const StyledFallback = styled(Avatar.Fallback, {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "white",
  fontSize: 15,
  lineHeight: 1,
  fontWeight: 500,
  width: "$5",
  height: "$5",
  borderRadius: "50%",
});

type DashboardProps = {
  projects?: Array<{ id: string; title: string }>;
  user: User;
  config: { designerPath: "string" };
};

export const Dashboard = ({ projects = [], config, user }: DashboardProps) => {
  const [selectedProject, setSelectedProject] = useState("");
  const [newProject, setNewProject] = useState("My awesome project");
  const actionData = useActionData();
  const navigate = useNavigate();
  const transition = useTransition();

  const handleOpen = () => {
    navigate(`${config.designerPath}/${selectedProject}`);
  };

  return (
    <>
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
                <Flex gap="1" align="center">
                  <Avatar.Root>
                    {user?.image && <Avatar.Image src={user?.image} />}
                    <StyledFallback delayMs={500}>
                      {(user?.username || "X").charAt(0).toLocaleUpperCase()}
                    </StyledFallback>
                  </Avatar.Root>

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
      <Flex
        css={{ height: "100vh" }}
        direction="column"
        align="center"
        justify="center"
      >
        <Card css={{ width: "$10", padding: "$5", zoom: 1.4 }} variant="active">
          <Flex direction="column" gap="2">
            <Heading>Select a project</Heading>
            <Select
              name="project"
              onChange={(event) => {
                setSelectedProject(event.target.value);
              }}
              value={selectedProject}
            >
              <option value="">Create new project</option>
              {projects.map(({ id, title }) => (
                <option value={id} key={id}>
                  {title}
                </option>
              ))}
            </Select>
            {selectedProject === "" ? (
              <Form method="post">
                <Flex gap="1">
                  <TextField
                    state={actionData?.errors ? "invalid" : undefined}
                    name="project"
                    defaultValue={newProject}
                    onFocus={(event) => {
                      event.target.select();
                    }}
                    onChange={(event) => {
                      setNewProject(event.target.value);
                    }}
                  />
                  <Button
                    disabled={
                      newProject.length === 0 ||
                      transition.state === "submitting"
                    }
                    type="submit"
                  >
                    {transition.state === "submitting"
                      ? "Creating..."
                      : "Create"}
                  </Button>
                </Flex>
                {actionData?.errors ? (
                  <Text variant="red" css={{ marginTop: "$1" }}>
                    {actionData.errors}
                  </Text>
                ) : null}
              </Form>
            ) : (
              <Button onClick={handleOpen}>Open</Button>
            )}
          </Flex>
        </Card>
      </Flex>
    </>
  );
};
