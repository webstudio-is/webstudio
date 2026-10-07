/** Tracks durable saves, rather than the UI's transient idle/syncing status. */
export const createDraftPersistence = () => {
  type Session = {
    projectId: string;
    pending: Set<string>;
    error?: Error;
  };
  let session: Session | undefined;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const invalidate = (projectId?: string) => {
    if (projectId !== undefined && session?.projectId !== projectId) {
      return;
    }
    if (session) {
      session.error = new Error(
        "Draft synchronization changed. Reload before testing the Form."
      );
    }
    notify();
  };
  return {
    reset(projectId?: string) {
      invalidate();
      session =
        projectId === undefined ? undefined : { projectId, pending: new Set() };
    },
    invalidate,
    begin(projectId: string, transactionId: string) {
      if (session?.projectId === projectId) {
        session.pending.add(transactionId);
      }
    },
    complete(projectId: string, transactionId: string, success: boolean) {
      if (
        session?.projectId !== projectId ||
        !session.pending.delete(transactionId)
      ) {
        return;
      }
      if (!success) {
        session.error = new Error(
          "Draft changes could not be saved. Reload before testing the Form."
        );
      }
      notify();
    },
    wait(
      projectId: string,
      {
        signal,
        timeoutMs = 30_000,
      }: { signal: AbortSignal; timeoutMs?: number }
    ) {
      const current = session;
      // Capture the submission boundary; later edits belong to the next submit.
      const pending = new Set(current?.pending);
      return new Promise<void>((resolve, reject) => {
        const finish = (error?: unknown) => {
          clearTimeout(timer);
          listeners.delete(check);
          signal.removeEventListener("abort", abort);
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        };
        const abort = () =>
          finish(signal.reason ?? new Error("Form submission canceled"));
        const check = () => {
          if (signal.aborted) {
            return abort();
          }
          if (
            !current ||
            current !== session ||
            current.projectId !== projectId
          ) {
            return finish(
              new Error(
                "Draft synchronization is not ready. Reload before testing the Form."
              )
            );
          }
          if (current.error) {
            return finish(current.error);
          }
          if ([...pending].every((id) => !current.pending.has(id))) {
            finish();
          }
        };
        const timer = setTimeout(
          () =>
            finish(
              new Error(
                "Draft changes are still saving. Try submitting again once saved."
              )
            ),
          timeoutMs
        );
        listeners.add(check);
        signal.addEventListener("abort", abort, { once: true });
        check();
      }).then(() => {
        if (signal.aborted) {
          throw signal.reason;
        }
        if (current !== session) {
          throw new Error("Draft synchronization changed. Try again.");
        }
        if (current?.error) {
          throw current.error;
        }
      });
    },
  };
};

export const draftPersistence = createDraftPersistence();
