import { useState } from "react";
import { Form, useActionData, useTransition } from "@remix-run/react";
import { useNavigate } from "react-router-dom";
import {
  Flex,
  Card,
  Select,
  TextField,
  Button,
  Heading,
  Text,
} from "~/shared/design-system";
import interStyles from "~/shared/font-faces/inter.css";
import dashboardStyles from "./dashboard.css";

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

type DashboardProps = {
  projects?: Array<{ id: string; title: string }>;
  config: { designerPath: "string" };
};

export const Dashboard = ({ projects = [], config }: DashboardProps) => {
  const [selectedProject, setSelectedProject] = useState("");
  const [newProject, setNewProject] = useState("My awesome project");
  const actionData = useActionData();
  const navigate = useNavigate();
  const transition = useTransition();

  const handleOpen = () => {
    navigate(`${config.designerPath}/${selectedProject}`);
  };

  return (
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
                    newProject.length === 0 || transition.state === "submitting"
                  }
                  type="submit"
                >
                  {transition.state === "submitting" ? "Creating..." : "Create"}
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
  );
};
