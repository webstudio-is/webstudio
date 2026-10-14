# Webstudio React Components

Production React implementations of the Webstudio component library.

## Component Registry Metadata

Webstudio component discovery uses a shadcn-compatible registry item shape with Webstudio-specific metadata stored in `meta`. The top-level registry fields stay compatible with shadcn conventions, while `meta.runtime`, `meta.authoring`, and `meta.builder` describe Webstudio component ids, props, content models, templates, insertion rules, and Builder/MCP guidance.

This package is not published as an installable shadcn registry yet; the shape is used internally by Builder and MCP discovery.

## Package boundary

Owns React implementations of production components. Keep components portable across host applications: Builder-only editing UI and router integrations belong in separate packages. Put shared contracts in the SDK and framework integrations in adapters.
