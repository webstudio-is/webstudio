## Properties Parsers

This folder contains:

- `parsers.ts` individual properties parses
- `to-longhand.ts` shorthand forms unwrappers

The idea is that these two modules export a number of utilities whose name match the property that they parse or unwrap e.g.:

- `backgroundImage` is a property parser
- `background` is a "to-longhand" unwrapper
