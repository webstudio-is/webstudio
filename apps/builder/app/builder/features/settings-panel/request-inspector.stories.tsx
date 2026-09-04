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
          title="Markdown frontmatter contains invalid YAML: Missing closing quote in title"
          location="content/articles/broken.md:4:1"
          details="Current query · Metadata · FRONTMATTER_INVALID · Asset: RI08dJPedj6XKX0nCJopT"
        />
        <RequestDiagnosticDisclosure
          defaultOpen={defaultOpen}
          severity="error"
          title="Unexpected closing tag in MDX content"
          location="content/articles/broken-component.mdx:18:3"
          details="Current query · Source · INVALID_MDX · Asset: broken-mdx"
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
