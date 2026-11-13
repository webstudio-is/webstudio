type SourceDiagnosticIdentity = {
  code: string;
  assetId?: string;
  path: string;
  line?: number;
  column?: number;
};

const getSourceDiagnosticIdentityKey = (issue: SourceDiagnosticIdentity) =>
  JSON.stringify([
    issue.code,
    issue.assetId,
    issue.path,
    issue.line,
    issue.column,
  ]);

export const removeMetadataIssuesDuplicatedBySource = <
  MetadataIssue extends SourceDiagnosticIdentity,
>({
  metadataIssues,
  sourceIssues,
}: {
  metadataIssues: readonly MetadataIssue[];
  sourceIssues: readonly SourceDiagnosticIdentity[];
}) => {
  const sourceIssueKeys = new Set(
    sourceIssues.map(getSourceDiagnosticIdentityKey)
  );
  return metadataIssues.filter(
    (issue) =>
      sourceIssueKeys.has(getSourceDiagnosticIdentityKey(issue)) === false
  );
};
