import { useState } from "react";
import { Form, useTransition } from "@remix-run/react";
import { useNavigate } from "react-router-dom";

import {
  Flex,
  Card,
  Select,
  TextField,
  Button,
  Heading,
  Text,
} from "@webstudio-is/design-system";

type SelectProjectProjectCardProps = {
  projects: Array<{ id: string; title: string }>;
  config: { designerPath: "string" };
  errors: string;
};

export const SelectProjectCard = ({
  projects,
  config,
  errors,
}: SelectProjectProjectCardProps) => {
  const [selectedProject, setSelectedProject] = useState("");
  const [newProject, setNewProject] = useState("My awesome project");
  const navigate = useNavigate();
  const transition = useTransition();

  const handleOpen = () => {
    navigate(`${config.designerPath}/${selectedProject}`);
  };

  const options = ["", ...projects.map((project) => project.id)];

  return (
    <Card size={2}>
      <Flex direction="column" gap="4">
        <Heading size="2" css={{ textAlign: "center" }}>
          Select a project
        </Heading>
        <Select
          size={2}
          name="project"
          options={options}
          onChange={setSelectedProject}
          value={selectedProject}
          placeholder="Create new project"
          getLabel={(option) =>
            projects.find((project) => project.id === option)?.title ||
            "Create new project"
          }
        />
        {selectedProject === "" ? (
          <Form method="post">
            <Flex gap="1">
              <TextField
                size={2}
                state={errors ? "invalid" : undefined}
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
                size={2}
                disabled={
                  newProject.length === 0 || transition.state === "submitting"
                }
                type="submit"
              >
                {transition.state === "submitting" ? "Creating..." : "Create"}
              </Button>
            </Flex>
            {errors ? (
              <Text variant="red" css={{ marginTop: "$1" }}>
                {errors}
              </Text>
            ) : null}
          </Form>
        ) : (
          <Button onClick={handleOpen} size={2}>
            Open
          </Button>
        )}
      </Flex>
    </Card>
  );
};
