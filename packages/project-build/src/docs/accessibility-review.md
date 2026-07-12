<!-- Adapted for Webstudio MCP from Community-Access/accessibility-agents, web-accessibility-wizard/SKILL.md (MIT): https://github.com/Community-Access/accessibility-agents/blob/main/codex-skills/web-accessibility-wizard/SKILL.md -->

# Webstudio Accessibility Review

Use this workflow when creating or reviewing a page, component, form, menu,
dialog, or responsive layout. It is an LLM-assisted review, not proof of WCAG
conformance. Do not claim that a page is accessible solely because this review
has no findings.

## Evidence First

1. Read `meta.index` and use focused project tools. Do not inspect Webstudio
   source code or generated files for normal project reviews.
2. Run `audit` with `{"scopes":["accessibility"]}` before changing
   anything. It detects deterministic metadata issues such as labels, landmark
   structure, positive tabindex values, invalid static ARIA states, and unmuted
   autoplay. Fix confirmed static findings first.
3. For each changed route, use `preview.start` and capture screenshots with
   `screenshot` at desktop, tablet, and mobile widths. Use `waitForSelector`
   or `waitForTimeout` only when the page has an actual delayed ready state.
4. Use `get-page-by-path`, `list-instances`, `inspect-instance`, and focused
   prop/style reads to verify semantics and authored state that screenshots
   cannot prove.
5. Make only supported, evidence-based fixes with semantic MCP tools. Recheck
   the affected route and the static accessibility search after every fix.

## Review Areas

Review these areas in priority order. Record the evidence for every finding.

### 1. Names, Semantics, and Structure

- Every image has purposeful alternative text or an explicitly empty alt when
  decorative. Image-submit inputs need a non-empty alt label describing their
  action.
- For `missing-image-description` findings, inspect the rendered image in its
  page context and call `set-image-descriptions` with either a concise generated
  description or `decorative: true`. Re-run the audit after saving the decision.
- Buttons, links, icon-only controls, and form controls have accessible names.
- Prefer native HTML semantics over ARIA roles.
- Non-native elements using `role="button"` or `role="link"` must be
  keyboard-focusable.
- Use one sensible page h1, ordered heading levels, meaningful link text, and
  a main landmark.
- Iframes have titles. Static HTML ids are unique, ARIA reference props point
  to real ids, and static boolean/select/numeric ARIA values are valid.
- Focusable controls must not be hidden from assistive technology with
  `aria-hidden`.

### 2. Keyboard and Focus

- Interactive controls should be native or have a documented keyboard model.
- Visible focus must not be removed without a visible replacement.
- Hover-only information or controls need a keyboard-accessible equivalent.
- Do not use positive tabindex values.
- Mark keyboard behavior as **manual verification required** when the available
  evidence cannot prove tab order, Escape handling, or focus restoration.

### 3. Dialogs, Menus, and Other Overlays

- Dialogs need an accessible name and a close action.
- Opening an overlay should move focus into it, trap focus where appropriate,
  and restore focus to its trigger on close.
- Menus, popovers, disclosures, and tabs must expose their expanded/selected
  state and remain usable without a pointer.
- If the current MCP/browser tools cannot exercise the interaction, report it
  as a manual verification item instead of guessing.

### 4. Forms and Errors

- Inputs have labels, required state, helpers, and errors associated with the
  right control.
- Invalid controls expose `aria-invalid` when applicable.
- Error, loading, and success feedback is not conveyed only by color or a
  transient visual toast.
- Submit controls do not become unexplained dead ends when disabled.

### 5. Visual, Responsive, Media, and Motion

- At each target width, text remains readable, controls remain reachable, and
  no content is clipped, overlapped, or dependent on hover alone.
- Do not rely only on color, position, shape, or iconography to convey meaning.
- Keep non-text contrast, text contrast, focus indicators, and small text as
  visual review items unless measured evidence is available.
- Videos with meaningful speech need captions; non-essential motion should
  respect reduced-motion preferences. Do not autoplay sound.

### 6. Dynamic Content and Data

- Loading, empty, error, and success states have understandable visible text.
- Important dynamic updates and validation feedback need an appropriate
  announcement strategy.
- Check repeated resource-driven content for unique labels, headings, ids, and
  meaningful empty states.

## Findings and Fixes

Classify every item as one of:

- **Confirmed:** directly shown by `audit`, project data, or a rendered
  screenshot.
- **Likely:** a credible issue inferred from rendered evidence; explain what
  would confirm it.
- **Manual verification required:** needs keyboard, screen-reader, contrast, or
  interaction testing that the available tools cannot prove.

For each item include: severity (`critical`, `high`, `medium`, or `low`), page
path, affected element or instance id when known, evidence, short user impact,
and the smallest supported fix. Fix critical and high items first. Do not add
ARIA attributes, alt text, labels, or live regions when their meaning cannot be
known from the project; ask the user or report the missing context.

Finish with a concise summary of fixed findings, remaining findings, and manual
verification items. Use screenshots as evidence of the rendered state, not as
proof of accessibility compliance.
