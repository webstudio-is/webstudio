import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const markdownBlogFixtureArticles = [
  {
    name: "aurora-trails.md",
    title: "Aurora trails",
    slug: "aurora-trails",
    publishedAt: "2026-05-20",
    excerpt: "A practical guide to planning a northern-lights journey.",
  },
  {
    name: "coastal-notes.md",
    title: "Coastal notes",
    slug: "coastal-notes",
    publishedAt: "2026-04-12",
    excerpt: "Slow travel ideas from a week beside the Atlantic.",
  },
  {
    name: "forest-cabins.md",
    title: "Forest cabins",
    slug: "forest-cabins",
    publishedAt: "2026-03-08",
    excerpt: "Five quiet cabins for an off-grid weekend.",
  },
  {
    name: "desert-light.md",
    title: "Desert light",
    slug: "desert-light",
    publishedAt: "2026-02-14",
    excerpt: "Photographing color and shadow in the high desert.",
  },
  {
    name: "city-walks.md",
    title: "City walks",
    slug: "city-walks",
    publishedAt: "2026-01-05",
    excerpt: "A collection of human-scale routes through old cities.",
  },
] as const;

export const markdownBlogFixtureAuthor = {
  name: "northstar-author.json",
  format: "json" as const,
  profile: {
    name: "Mira Chen",
    role: "Northstar editor",
  },
};

export const markdownBlogFixtureDocuments = [
  ...markdownBlogFixtureArticles.map(({ name }) => ({
    name,
    format: "md" as const,
  })),
  {
    name: markdownBlogFixtureAuthor.name,
    format: markdownBlogFixtureAuthor.format,
  },
] as const;

const articleSource = (
  article: (typeof markdownBlogFixtureArticles)[number]
) => `---
title: ${article.title}
slug: ${article.slug}
publishedAt: ${article.publishedAt}
draft: false
excerpt: ${article.excerpt}
author:
  $ref: ./northstar-author.json#/profile
---

# ${article.title}

${article.excerpt}

This article is part of the Northstar field journal. It provides enough body
content to verify that the detail route reads and renders Markdown content.
`;

export const writeMarkdownBlogFixtureFiles = async (
  projectDirectory: string
) => {
  const assetsDirectory = join(projectDirectory, ".webstudio/assets");
  await mkdir(assetsDirectory, { recursive: true });
  await Promise.all([
    ...markdownBlogFixtureArticles.map((article) =>
      writeFile(join(assetsDirectory, article.name), articleSource(article))
    ),
    writeFile(
      join(assetsDirectory, markdownBlogFixtureAuthor.name),
      `${JSON.stringify({ profile: markdownBlogFixtureAuthor.profile }, undefined, 2)}\n`
    ),
  ]);
};
