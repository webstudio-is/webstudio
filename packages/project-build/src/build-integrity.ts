import {
  blockTemplateComponent,
  findTreeInstanceIds,
  formatContentBlockSourceIntegrityIssue,
  getContentBlockSourceIntegrityIssues,
  portalComponent,
  type Asset,
  type ContentBlockSourceIntegrityIssue,
  type DataSource,
  type Instance,
  type Prop,
  type Resource,
} from "@webstudio-is/sdk";

export type BuildIntegrityIssue =
  | {
      type: "missingResource";
      source: "dataSource";
      dataSourceId: string;
      dataSourceName: string;
      resourceId: string;
    }
  | {
      type: "missingResource";
      source: "prop";
      propId: string;
      propName: string;
      resourceId: string;
    }
  | {
      type: "slotInContentBlockTemplates";
      instanceId: string;
      templatesInstanceId: string;
    }
  | ContentBlockSourceIntegrityIssue;

export const getBuildIntegrityIssues = ({
  dataSources,
  props,
  resources,
  instances = [],
  assets,
}: {
  dataSources: Iterable<DataSource>;
  props: Iterable<Prop>;
  resources: Iterable<Resource>;
  instances?: Iterable<Instance>;
  assets?: Iterable<Asset>;
}): BuildIntegrityIssue[] => {
  const propsList = Array.from(props);
  const instancesList = Array.from(instances);
  const issues: BuildIntegrityIssue[] = [
    ...getContentBlockSourceIntegrityIssues({
      instances: instancesList,
      props: propsList,
      assets,
    }),
  ];
  const instancesById = new Map(
    instancesList.map((instance) => [instance.id, instance])
  );
  for (const templates of instancesList) {
    if (templates.component !== blockTemplateComponent) {
      continue;
    }
    for (const instanceId of findTreeInstanceIds(instancesById, templates.id)) {
      if (instancesById.get(instanceId)?.component === portalComponent) {
        issues.push({
          type: "slotInContentBlockTemplates",
          instanceId,
          templatesInstanceId: templates.id,
        });
      }
    }
  }
  const resourceIds = new Set<string>();

  for (const resource of resources) {
    resourceIds.add(resource.id);
  }

  for (const dataSource of dataSources) {
    if (
      dataSource.type === "resource" &&
      resourceIds.has(dataSource.resourceId) === false
    ) {
      issues.push({
        type: "missingResource",
        source: "dataSource",
        dataSourceId: dataSource.id,
        dataSourceName: dataSource.name,
        resourceId: dataSource.resourceId,
      });
    }
  }

  for (const prop of propsList) {
    if (prop.type === "resource" && resourceIds.has(prop.value) === false) {
      issues.push({
        type: "missingResource",
        source: "prop",
        propId: prop.id,
        propName: prop.name,
        resourceId: prop.value,
      });
    }
  }

  return issues;
};

export const formatBuildIntegrityIssue = (
  issue: BuildIntegrityIssue
): string => {
  if (issue.type === "slotInContentBlockTemplates") {
    return `Shared Slot "${issue.instanceId}" is inside Content Block Templates "${issue.templatesInstanceId}". Duplicate the Slot content into a regular template instead.`;
  }
  if (issue.type !== "missingResource") {
    return formatContentBlockSourceIntegrityIssue(issue);
  }
  if (issue.source === "dataSource") {
    return `resource variable "${issue.dataSourceName}" (${issue.dataSourceId}) references missing resource "${issue.resourceId}".`;
  }
  return `prop "${issue.propName}" (${issue.propId}) references missing resource "${issue.resourceId}".`;
};

export const formatBuildIntegrityError = (
  issue: BuildIntegrityIssue,
  messagePrefix = "Build integrity failed"
): string => {
  return `${messagePrefix}: ${formatBuildIntegrityIssue(issue)}`;
};

export const assertBuildIntegrity = (
  data: {
    dataSources: Iterable<DataSource>;
    props: Iterable<Prop>;
    resources: Iterable<Resource>;
    instances?: Iterable<Instance>;
    assets?: Iterable<Asset>;
  },
  options: { messagePrefix?: string } = {}
) => {
  const issues = getBuildIntegrityIssues(data);
  const firstIssue = issues[0];
  if (firstIssue !== undefined) {
    throw new Error(
      formatBuildIntegrityError(firstIssue, options.messagePrefix)
    );
  }
};

export const assertContentBlockSourceIntegrity = (
  data: {
    instances: Iterable<Instance>;
    props: Iterable<Prop>;
    assets?: Iterable<Asset>;
  },
  options: { messagePrefix?: string } = {}
) => {
  const firstIssue = getContentBlockSourceIntegrityIssues(data)[0];
  if (firstIssue !== undefined) {
    throw new Error(
      formatBuildIntegrityError(firstIssue, options.messagePrefix)
    );
  }
};
