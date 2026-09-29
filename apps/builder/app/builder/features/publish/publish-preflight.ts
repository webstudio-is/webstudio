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

  try {
    void Promise.resolve(checks()).catch(reportFailure);
  } catch (error) {
    reportFailure(error);
  }

  return publish();
};
