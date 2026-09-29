export const runPublishAfterBestEffortChecks = async <T>({
  checks,
  onCheckFailure,
  publish,
}: {
  checks: () => Promise<unknown>;
  onCheckFailure: (error: unknown) => void;
  publish: () => Promise<T>;
}) => {
  try {
    await checks();
  } catch (error) {
    try {
      onCheckFailure(error);
    } catch (reportError) {
      console.error("Could not report publish diagnostics", reportError);
    }
  }

  return publish();
};
