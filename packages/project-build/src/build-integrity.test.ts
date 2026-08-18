import { describe, expect, test } from "vitest";
import type { DataSource, Prop, Resource } from "@webstudio-is/sdk";
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
      })
    ).toEqual([]);
  });
});
