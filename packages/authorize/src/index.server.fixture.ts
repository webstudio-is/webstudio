// Manual test on local data.

import * as acl from "./index.server";
import { v4 as uuidv4 } from "uuid";

const createUser = async (name: string, email: string) => {
  const user = {
    id: uuidv4(),
    name,
    email,
  };

  await acl.deleteRelation({
    namespace: "User",
    object: email,
    relation: "email",
  });

  // create email relation
  await acl.createRelation({
    namespace: "User",
    object: email,
    relation: "email",
    subject: user.id,
  });

  return user;
};

const createProject = async (
  createdBy: { id: string },
  projectName: string
) => {
  const project = {
    id: uuidv4(),
    name: projectName,
    createdBy: createdBy.id,
  };

  // Create owner relation
  await acl.createRelation({
    namespace: "Project",
    object: project.id,
    relation: "owner",
    subject: createdBy.id,
  });

  return project;
};

const addProjectMemberByEmail = async (
  project: Awaited<ReturnType<typeof createProject>>,
  email: string,
  relation: "reader" | "writer"
) => {
  await acl.deleteRelation({
    namespace: "Project",
    object: project.id,
    subjectSet: {
      namespace: "User",
      object: email,
      relation: "email",
    },
  });

  await acl.createRelation({
    namespace: "Project",
    object: project.id,
    relation: "reader",
    subjectSet: {
      namespace: "User",
      object: email,
      relation: "email",
    },
  });
};

// @todo delete this
// pnpm tsx ./packages/authorize/src/index.server.ts
const testOwnerRelation = async () => {
  const userBob = await createUser("Bob", "bob@bob.com");

  const userAlice = await createUser("Alice", "alice@alice.com");

  const projectAliceA = await createProject(userAlice, "Alice Project A");
  const projectAliceB = await createProject(userAlice, "Alice Project B");
  const projectBobA = await createProject(userBob, "Bob Project A");

  // eslint-disable-next-line no-console
  console.info(`Alice created 2 projects, Bob created 1 project.`);

  const isAliceCanReadProjectA = await acl.checkRelation({
    namespace: "Project",
    object: projectAliceA.id,
    relation: "reader",
    subject: userAlice.id,
  });

  const isAliceCanReadProjectB = await acl.checkRelation({
    namespace: "Project",
    object: projectAliceB.id,
    relation: "reader",
    subject: userAlice.id,
  });

  const isAliceCanWriteProjectA = await acl.checkRelation({
    namespace: "Project",
    object: projectAliceA.id,
    relation: "writer",
    subject: userAlice.id,
  });

  const isAliceOwnerProjectA = await acl.checkRelation({
    namespace: "Project",
    object: projectAliceA.id,
    relation: "owner",
    subject: userAlice.id,
  });

  const isBobCanWriteProjectA = await acl.checkRelation({
    namespace: "Project",
    object: projectAliceA.id,
    relation: "writer",
    subject: userBob.id,
  });

  const isBobOwnerOfProjectA = await acl.checkRelation({
    namespace: "Project",
    object: projectAliceA.id,
    relation: "owner",
    subject: userBob.id,
  });

  let isAliceCanReadBobProjectA = await acl.checkRelation({
    namespace: "Project",
    object: projectBobA.id,
    relation: "reader",
    subject: userAlice.id,
  });

  let isAliceCanWriteBobProjectA = await acl.checkRelation({
    namespace: "Project",
    object: projectBobA.id,
    relation: "reader",
    subject: userAlice.id,
  });

  // eslint-disable-next-line no-console
  console.info({
    isAliceCanReadProjectA,
    isAliceCanReadProjectB,
    isAliceCanWriteProjectA,
    isAliceOwnerProjectA,
    isBobCanWriteProjectA,
    isBobOwnerOfProjectA,
    isAliceCanReadBobProjectA,
    isAliceCanWriteBobProjectA,
  });

  // eslint-disable-next-line no-console
  console.info(`Bob adds Alice as a reader of Bob Project A.`);

  // Now Bob wants to add Alice as a reader of his project
  await addProjectMemberByEmail(projectBobA, userAlice.email, "reader");

  isAliceCanReadBobProjectA = await acl.checkRelation({
    namespace: "Project",
    object: projectBobA.id,
    relation: "reader",
    subject: userAlice.id,
  });

  isAliceCanWriteBobProjectA = await acl.checkRelation({
    namespace: "Project",
    object: projectBobA.id,
    relation: "writer",
    subject: userAlice.id,
  });

  // eslint-disable-next-line no-console
  console.info({ isAliceCanReadBobProjectA, isAliceCanWriteBobProjectA });

  // eslint-disable-next-line no-console
  console.info(`Bob adds Alice as a writer of Bob Project A.`);
  // Now Bob want to add write access to Alice
  await addProjectMemberByEmail(projectBobA, userAlice.email, "writer");

  isAliceCanReadBobProjectA = await acl.checkRelation({
    namespace: "Project",
    object: projectBobA.id,
    relation: "reader",
    subject: userAlice.id,
  });

  isAliceCanWriteBobProjectA = await acl.checkRelation({
    namespace: "Project",
    object: projectBobA.id,
    relation: "reader",
    subject: userAlice.id,
  });

  // eslint-disable-next-line no-console
  console.info({ isAliceCanReadBobProjectA, isAliceCanWriteBobProjectA });

  const expandedRelations = await acl.queryRelation({
    namespace: "Project",
    object: projectBobA.id,
  });

  // eslint-disable-next-line no-console
  console.log(expandedRelations);

  const relations = await acl.queryRelation(
    {
      namespace: "Project",
      object: projectBobA.id,
    },
    false
  );

  // eslint-disable-next-line no-console
  console.log(relations);

  // eslint-disable-next-line no-console
  console.info(`Bob deletes Bob Project A.`);
  // Now drop Bob project and all relations
  await acl.deleteRelation({
    namespace: "Project",
    object: projectBobA.id,
  });

  isAliceCanReadBobProjectA = await acl.checkRelation({
    namespace: "Project",
    object: projectBobA.id,
    relation: "reader",
    subject: userAlice.id,
  });

  isAliceCanWriteBobProjectA = await acl.checkRelation({
    namespace: "Project",
    object: projectBobA.id,
    relation: "reader",
    subject: userAlice.id,
  });

  // eslint-disable-next-line no-console
  console.info({ isAliceCanReadBobProjectA, isAliceCanWriteBobProjectA });

  // Cleanup
  await acl.deleteRelation({
    namespace: "Project",
    object: projectAliceA.id,
  });
  await acl.deleteRelation({
    namespace: "Project",
    object: projectAliceB.id,
  });

  await acl.deleteRelation({
    namespace: "User",
    subject: userAlice.id,
  });

  await acl.deleteRelation({
    namespace: "User",
    subject: userBob.id,
  });
};

testOwnerRelation();
