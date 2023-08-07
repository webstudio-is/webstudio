import { Button, Text } from "@webstudio-is/design-system";
import {
  useEntri,
  entriGlobalStyles,
  type DnsRecord,
  type EntriCloseDetail,
} from "~/shared/entri/entri";

export const Entri = ({
  dnsRecords,
  domain,
  onClose,
  isPublishing,
}: {
  dnsRecords: DnsRecord[];
  domain: string;
  onClose: (detail: EntriCloseDetail) => void;
  isPublishing: boolean;
}) => {
  entriGlobalStyles();
  const { error, isOpen, showDialog } = useEntri({
    onClose,
    domain,
    dnsRecords,
  });

  return (
    <>
      {error !== undefined && <Text color="destructive">{error}</Text>}

      <Button
        disabled={isOpen || isPublishing}
        color="neutral"
        css={{ width: "100%", flexShrink: 0 }}
        onClick={() => {
          showDialog();
        }}
      >
        Configure automatically
      </Button>
    </>
  );
};
