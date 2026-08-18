import { describe, expect, test } from "vitest";
import {
  blockComponent,
  type DataSource,
  type FileAsset,
  type Instance,
  type Prop,
  type Resource,
} from "@webstudio-is/sdk";
import {
  assertBuildIntegrity,
  formatBuildIntegrityError,
  formatBuildIntegrityIssue,
  getBuildIntegrityIssues,
} from "./build-integrity";

const resource: Resource = {
  id: "resourceId",
  name: "Resource",
  method: "get",
  url: `""`,
  headers: [],
};

describe("getBuildIntegrityIssues", () => {
  test("reports invalid Content Block source references", () => {
    const block: Instance = {
      type: "instance",
      id: "block",
      component: blockComponent,
      children: [],
    };
    const source: Prop = {
      id: "source",
      instanceId: block.id,
      name: "src",
      type: "asset",
      value: "post",
    };
    const markdownAsset: FileAsset = {
      id: "post",
      projectId: "project",
      type: "file",
      name: "post_hash.md",
      filename: "post",
      format: "md",
      size: 1,
      meta: {},
      description: null,
      createdAt: "2026-08-14T00:00:00.000Z",
    };

    const issues = getBuildIntegrityIssues({
      dataSources: [],
      props: [source],
      resources: [],
      instances: [block],
      assets: [markdownAsset],
    });

    expect(issues).toEqual([
      {
        type: "incompatibleContentBlockSourceAsset",
        blockInstanceId: "block",
        propId: "source",
        assetId: "post",
        assetName: "post_hash.md",
      },
    ]);
    expect(formatBuildIntegrityIssue(issues[0])).toBe(
      'Content Block source prop "source" references Asset "post" (post_hash.md), which is not an MDX file.'
    );
  });

  test("reports resource variables referencing missing resources", () => {
    const dataSource: DataSource = {
      type: "resource",
      id: "dataSourceId",
      name: "pinnedAnnouncementData_1",
      resourceId: "missingResourceId",
    };

    const issues = getBuildIntegrityIssues({
      dataSources: [dataSource],
      props: [],
      resources: [],
      instances: [],
    });

    expect(issues).toEqual([
      {
        type: "missingResource",
        source: "dataSource",
        dataSourceId: "dataSourceId",
        dataSourceName: "pinnedAnnouncementData_1",
        resourceId: "missingResourceId",
      },
    ]);
    expect(formatBuildIntegrityIssue(issues[0])).toEqual(
      `resource variable "pinnedAnnouncementData_1" (dataSourceId) references missing resource "missingResourceId".`
    );
    expect(formatBuildIntegrityError(issues[0], "Cannot publish")).toEqual(
      `Cannot publish: resource variable "pinnedAnnouncementData_1" (dataSourceId) references missing resource "missingResourceId".`
    );
    expect(() =>
      assertBuildIntegrity(
        {
          dataSources: [dataSource],
          props: [],
          resources: [],
          instances: [],
        },
        { messagePrefix: "Cannot publish" }
      )
    ).toThrow(
      `Cannot publish: resource variable "pinnedAnnouncementData_1" (dataSourceId) references missing resource "missingResourceId".`
    );
  });

  test("reports resource props referencing missing resources", () => {
    const prop: Prop = {
      type: "resource",
      id: "propId",
      instanceId: "instanceId",
      name: "onSubmit",
      value: "missingResourceId",
    };

    const issues = getBuildIntegrityIssues({
      dataSources: [],
      props: [prop],
      resources: [],
      instances: [],
    });

    expect(issues).toEqual([
      {
        type: "missingResource",
        source: "prop",
        propId: "propId",
        propName: "onSubmit",
        resourceId: "missingResourceId",
      },
    ]);
    expect(formatBuildIntegrityIssue(issues[0])).toEqual(
      `prop "onSubmit" (propId) references missing resource "missingResourceId".`
    );
  });

  test("ignores resource references that exist", () => {
    const dataSource: DataSource = {
      type: "resource",
      id: "dataSourceId",
      name: "data",
      resourceId: resource.id,
    };
    const prop: Prop = {
      type: "resource",
      id: "propId",
      instanceId: "instanceId",
      name: "onSubmit",
      value: resource.id,
    };

    expect(
      getBuildIntegrityIssues({
        dataSources: [dataSource],
        props: [prop],
        resources: [resource],
        instances: [],
      })
    ).toEqual([]);
  });
});
