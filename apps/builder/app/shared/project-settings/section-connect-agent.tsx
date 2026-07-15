import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  Button,
  Grid,
  Select,
  Text,
  TextArea,
} from "@webstudio-is/design-system";
import { CopyIcon } from "@webstudio-is/icons";
import {
  agentClients,
  createAgentClientConfiguration,
  createAgentShareUrl,
  createAgentSetupCommand,
  type AgentClient,
} from "@webstudio-is/protocol";
import { CopyToClipboard } from "~/shared/copy-to-clipboard";
import { $authToken } from "~/shared/nano-states";
import { sectionSpacing } from "./utils";

const clientLabels: Record<AgentClient, string> = {
  claude: "Claude Code",
  codex: "Codex",
  cursor: "Cursor",
  vscode: "VS Code",
};
const clientOptions = agentClients.map((value) => ({
  value,
  label: clientLabels[value],
}));

export const SectionConnectAgent = () => {
  const authToken = useStore($authToken);
  const [client, setClient] = useState<AgentClient>("claude");
  const [shareUrl, setShareUrl] = useState<string>();

  useEffect(() => {
    if (authToken === undefined) {
      setShareUrl(undefined);
      return;
    }
    setShareUrl(
      createAgentShareUrl({
        builderUrl: window.location.href,
        authToken,
      })
    );
  }, [authToken]);

  const configuration = createAgentClientConfiguration(client);
  const setupCommand =
    shareUrl === undefined
      ? undefined
      : createAgentSetupCommand({ client, shareUrl });

  return (
    <Grid gap={3} css={sectionSpacing}>
      <Text variant="titles">Connect your Agent</Text>
      <Select
        options={clientOptions}
        value={clientOptions.find(({ value }) => value === client)}
        getValue={({ value }) => value}
        getLabel={({ label }) => label}
        onChange={(option) => setClient(option.value)}
      />
      {setupCommand === undefined ? (
        <Text color="subtle">
          Create or replace an editable link from Share, then open it and return
          here. Revoking that link also revokes agent access.
        </Text>
      ) : (
        <Grid gap={1}>
          <Text variant="labels">Run in your local project folder</Text>
          <TextArea variant="mono" rows={5} readOnly value={setupCommand} />
          <CopyToClipboard text={setupCommand} copyText="Copy setup command">
            <Button prefix={<CopyIcon />} css={{ justifySelf: "start" }}>
              Copy setup command
            </Button>
          </CopyToClipboard>
        </Grid>
      )}
      <Grid gap={1}>
        <Text variant="labels">Configuration: {configuration.path}</Text>
        <TextArea
          variant="mono"
          rows={8}
          readOnly
          value={configuration.content}
        />
        <Text color="subtle">{configuration.hint}</Text>
      </Grid>
    </Grid>
  );
};
