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
  agentClientDefinitions,
  createAgentQuickstart,
  createAgentShareUrl,
  type AgentClient,
} from "@webstudio-is/protocol";
import { CopyToClipboard } from "~/shared/copy-to-clipboard";
import { $authToken } from "~/shared/nano-states";
import { sectionSpacing } from "./utils";

const clientOptions = agentClients.map((value) => ({
  value,
  label: agentClientDefinitions[value].label,
}));

export const createConnectAgentViewModel = ({
  client,
  shareUrl,
}: {
  client: AgentClient;
  shareUrl?: string;
}) => {
  return createAgentQuickstart({ client, shareUrl });
};

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

  const { configuration, setupCommand, steps } = createConnectAgentViewModel({
    client,
    shareUrl,
  });

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
        {steps.slice(-2).map((step) => (
          <Text key={step.phase} color="subtle">
            {step.label}
          </Text>
        ))}
      </Grid>
    </Grid>
  );
};
