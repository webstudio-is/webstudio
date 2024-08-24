import {
  Toast,
  Text,
  TooltipProvider,
  Flex,
} from "@webstudio-is/design-system";

export type ErrorPageProps = {
  error: {
    message: string;
    description?: string;
  };
  onCloseNavigateTo: string;
};

export const ErrorPage = (props: ErrorPageProps) => {
  return (
    <TooltipProvider>
      <Flex
        css={{
          position: "fixed",
          inset: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Flex>
          <Toast
            variant={"error"}
            onCopy={() => {
              navigator.clipboard.writeText(
                `${props.error.message}\n${props.error.description}`
              );
            }}
            onClose={() => {
              window.location.href = props.onCloseNavigateTo;
            }}
          >
            <Text variant={"titles"}>{props.error.message}</Text>
            <Text>{props.error.description}</Text>
          </Toast>
        </Flex>
      </Flex>
    </TooltipProvider>
  );
};
