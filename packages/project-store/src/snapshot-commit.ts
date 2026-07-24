import type {
  ProjectHead,
  ProjectHeadUpdateResult,
  ProjectSnapshotCommitInput,
  ProjectSnapshotReference,
} from "./types";

export const commitProjectSnapshot = async <
  HeadReference extends ProjectSnapshotReference,
  WrittenReference extends HeadReference,
>({
  input,
  getHead,
  writeSnapshot,
  updateHead,
}: {
  input: ProjectSnapshotCommitInput;
  getHead: (name: string) => Promise<ProjectHead<HeadReference> | undefined>;
  writeSnapshot: (
    input: ProjectSnapshotCommitInput["snapshot"]
  ) => Promise<WrittenReference>;
  updateHead: (input: {
    name: string;
    expectedRevision?: ProjectHead<HeadReference>["revision"];
    reference: WrittenReference;
  }) => Promise<ProjectHeadUpdateResult<HeadReference>>;
}) => {
  const current = await getHead(input.headName);
  if (current?.revision !== input.expectedRevision) {
    return {
      status: "conflict",
      ...(current === undefined ? {} : { head: current }),
    } as const;
  }
  const reference = await writeSnapshot(input.snapshot);
  return await updateHead({
    name: input.headName,
    expectedRevision: input.expectedRevision,
    reference,
  });
};
