# Webstudio SDK Components

Webstudio SDK is a TypeScript API that lets you use your Webstudio project or some components in your custom codebase or just render a complete Remix Document.

## Component Registry Metadata

Webstudio component discovery uses a shadcn-compatible registry item shape with Webstudio-specific metadata stored in `meta`. The top-level registry fields stay compatible with shadcn conventions, while `meta.runtime`, `meta.authoring`, and `meta.builder` describe Webstudio component ids, props, content models, templates, insertion rules, and Builder/MCP guidance.

This package is not published as an installable shadcn registry yet; the shape is used internally by Builder and MCP discovery.
