import { useState } from "react";
import { Form, useTransition } from "@remix-run/react";
import { useNavigate } from "react-router-dom";
import {
  Flex,
  Card,
  Select,
  TextField,
  Button,
  DeprecatedHeading,
  Text,
} from "@webstudio-is/design-system";
import { designerPath } from "~/shared/router-utils";

type SelectProjectProjectCardProps = {
  projects: Array<{ id: string; title: string }>;
  errors: string;
};

export const SelectProjectCard = ({
  projects,
  errors,
}: SelectProjectProjectCardProps) => {
  const [selectedProject, setSelectedProject] = useState("");
  const [newProject, setNewProject] = useState("My awesome project");
  const navigate = useNavigate();
  const transition = useTransition();

  const handleOpen = () => {
    navigate(designerPath({ projectId: selectedProject }));
  };

  const options = ["", ...projects.map((project) => project.id)];

  return (
    <Card size={2}>
      <Flex direction="column" gap="4">
        <DeprecatedHeading size="2" css={{ textAlign: "center" }}>
          Select a project
        </DeprecatedHeading>
        <Select
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
                disabled={
                  newProject.length === 0 || transition.state === "submitting"
                }
                type="submit"
                size="2"
              >
                {transition.state === "submitting" ? "Creating..." : "Create"}
              </Button>
            </Flex>
            {errors ? (
              <Text color="error" css={{ marginTop: "$spacing$3" }}>
                {errors}
              </Text>
            ) : null}
          </Form>
        ) : (
          <Button onClick={handleOpen} size="2">
            Open
          </Button>
        )}
      </Flex>
    </Card>
  );
};
