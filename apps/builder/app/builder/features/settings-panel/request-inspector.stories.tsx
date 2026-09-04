import { Flex, StorySection } from "@webstudio-is/design-system";
import {
  RequestDiagnosticDisclosure,
  RequestDiagnosticsTable,
} from "./request-inspector";

export default {
  title: "Settings panel/Request diagnostics",
  component: RequestDiagnosticDisclosure,
};

const DiagnosticExamples = ({
  defaultOpen,
  width = 816,
}: {
  defaultOpen: boolean;
  width?: number;
}) => (
  <StorySection title={defaultOpen ? "Expanded" : "Collapsed"}>
    <Flex direction="column" gap={5} css={{ width, maxWidth: "100%" }}>
      <RequestDiagnosticsTable>
        <RequestDiagnosticDisclosure
          defaultOpen={defaultOpen}
          severity="warning"
          title='Missing closing "quote at line 3, column 1: published: true ^'
          location="content/articles/broken.md:4:1"
          details={[
            { label: "Context", value: "Current query" },
            { label: "Phase", value: "Metadata" },
            { label: "Code", value: "FRONTMATTER_INVALID" },
            { label: "Asset ID", value: "RI08dJPedj6XKX0nCJopT" },
            {
              label: "Reason",
              value:
                'Missing closing "quote at line 3, column 1: published: true ^',
            },
          ]}
        />
        <RequestDiagnosticDisclosure
          defaultOpen={defaultOpen}
          severity="error"
          title="Unexpected closing tag in MDX content"
          location="content/articles/broken-component.mdx:18:3"
          details={[
            { label: "Context", value: "Current query" },
            { label: "Phase", value: "Source" },
            { label: "Code", value: "INVALID_MDX" },
            { label: "Asset ID", value: "broken-mdx" },
            { label: "Reason", value: "Unexpected closing tag in MDX content" },
          ]}
        />
      </RequestDiagnosticsTable>
    </Flex>
  </StorySection>
);

export const Collapsed = () => <DiagnosticExamples defaultOpen={false} />;

export const Expanded = () => <DiagnosticExamples defaultOpen />;

export const ExpandedNarrow = () => (
  <DiagnosticExamples defaultOpen width={320} />
);

export const ExpandedDark = () => <DiagnosticExamples defaultOpen />;

ExpandedDark.globals = { colorScheme: "dark" };
