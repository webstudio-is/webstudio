# Radix Components for Webstudio

Radix Primitives is a low-level UI component library with a focus on accessibility and customization.
Default styling is inspired by https://ui.shadcn.com/docs.

## Component Registry Metadata

Webstudio Radix component discovery uses the shared Webstudio registry format: a shadcn-compatible registry item shape with Webstudio-specific metadata stored in `meta`. The superset metadata describes Radix composition, required parts, props, states, templates, insertion rules, and Builder/MCP guidance.

This package is not published as an installable shadcn registry yet; the shape is used internally by Builder and MCP discovery.
