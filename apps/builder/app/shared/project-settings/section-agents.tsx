import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { Flex, Grid, Text, Tooltip } from "@webstudio-is/design-system";
import { InfoCircleIcon } from "@webstudio-is/icons";
import { CodeEditor } from "~/shared/code-editor";
import { $projectSettings } from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { sectionSpacing } from "./utils";

export const SectionAgents = () => {
  const projectSettings = useStore($projectSettings);
  const instructions = projectSettings?.meta.agentInstructions ?? "";
  const [value, setValue] = useState(instructions);

  useEffect(() => setValue(instructions), [instructions]);

  return (
    <Grid
      gap={2}
      css={{ height: "100%", gridTemplateRows: "auto minmax(0, 1fr)" }}
    >
      <Flex align="center" gap={1} css={sectionSpacing}>
        <Text variant="titles">Agents</Text>
        <Tooltip
          variant="wrapped"
          content="Give AI coding agents project-specific guidance. When you sync the project locally, Webstudio writes these instructions to a managed AGENTS.md in the project root. An existing user-owned AGENTS.md is never overwritten."
        >
          <InfoCircleIcon tabIndex={0} />
        </Tooltip>
      </Flex>
      <Grid gap={1} css={{ ...sectionSpacing, minHeight: 0 }}>
        <CodeEditor
          title="Instructions"
          lang="markdown"
          size="full"
          value={value}
          onChange={setValue}
          onChangeComplete={(agentInstructions) => {
            executeRuntimeMutation({
              id: "projectSettings.update",
              input: { meta: { agentInstructions } },
            });
          }}
        />
      </Grid>
    </Grid>
  );
};
