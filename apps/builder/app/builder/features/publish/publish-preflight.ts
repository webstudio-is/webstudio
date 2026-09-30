export const runPublishAfterBestEffortChecks = <T>({
  checks,
  onCheckFailure,
  publish,
}: {
  checks: () => Promise<unknown>;
  onCheckFailure: (error: unknown) => void;
  publish: () => Promise<T>;
}): Promise<T> => {
  const reportFailure = (error: unknown) => {
    try {
      onCheckFailure(error);
    } catch (reportError) {
      try {
        console.error("Could not report publish diagnostics", reportError);
      } catch {}
    }
  };

  void Promise.resolve().then(checks).catch(reportFailure);
  return publish();
};
