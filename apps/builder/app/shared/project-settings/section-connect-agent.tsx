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
  agentClientDefinitions,
  createAgentQuickstart,
  createAgentShareUrl,
  type AgentClient,
  type AgentClientDefinition,
} from "@webstudio-is/protocol";
import { CopyToClipboard } from "~/shared/copy-to-clipboard";
import { $authToken } from "~/shared/nano-states";
import { sectionSpacing } from "./utils";

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

  const { configuration, setupCommand, completion } = createAgentQuickstart({
    client,
    shareUrl,
  });

  return (
    <Grid gap={3} css={sectionSpacing}>
      <Text variant="titles">Connect your Agent</Text>
      <Select
        options={agentClientDefinitions}
        value={agentClientDefinitions.find(
          (option) => option.client === client
        )}
        getValue={({ client }: AgentClientDefinition) => client}
        getLabel={({ label }: AgentClientDefinition) => label}
        onChange={(option) => setClient(option.client)}
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
        <Text color="subtle">{completion.connection}</Text>
        <Text color="subtle">{completion.firstRead}</Text>
      </Grid>
    </Grid>
  );
};
