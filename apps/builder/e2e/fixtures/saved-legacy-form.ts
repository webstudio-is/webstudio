import {
  createBuilderBuildDataSnapshotFromState,
  createBuilderStateFromBuildData,
} from "@webstudio-is/project-build/state";

/** Emulates a Form saved before MCP stopped offering the legacy component. */
export const seedSavedLegacyForm = ({
  state,
  rootInstanceId,
  formId,
}: {
  state: ReturnType<typeof createBuilderStateFromBuildData>;
  rootInstanceId: string;
  formId: string;
}) => {
  const snapshot = createBuilderBuildDataSnapshotFromState(state);
  const instances = snapshot.instances;
  const root = instances?.find(({ id }) => id === rootInstanceId);
  if (instances === undefined || root === undefined) {
    throw new Error("Expected the saved page root instance");
  }
  if (instances.some(({ id }) => id === formId)) {
    throw new Error("Saved legacy Form ID already exists");
  }
  snapshot.instances = [
    ...instances.map((instance) =>
      instance.id === rootInstanceId
        ? {
            ...instance,
            children: [
              ...instance.children,
              { type: "id" as const, value: formId },
            ],
          }
        : instance
    ),
    { type: "instance", id: formId, component: "WebhookForm", children: [] },
  ];
  return createBuilderStateFromBuildData(snapshot);
};
