import { Button, Flex, TextField } from "@webstudio-is/design-system";

type ShareProjectProps = { url: string };

export const ShareProject = ({ url }: ShareProjectProps) => {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        window.open(url, "_blank");
      }}
    >
      <Flex gap="2">
        <TextField
          variant="ghost"
          readOnly
          defaultValue={url}
          onFocus={(event) => {
            event?.target.select();
          }}
        />
        <Button aria-label="Open in a new tab" type="submit">
          Open
        </Button>
      </Flex>
    </form>
  );
};
