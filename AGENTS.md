# AGENTS.md

This repository contains a conservative HTML-first importer for Baden-Württemberg education plans.

Principles:
- Never hard-code domain names or counts.
- Preserve source HTML and raw text for every parsed page.
- Prefer explicit incompleteness over guessed data.
- `metadata.conversion.complete` may only be true when validation has no errors and no unparsed content blocks.
- Keep HTML -> IR and IR -> Roo transformation separate.
- Add/adjust fixtures before changing parser behavior.
- Do not silently resolve unknown references; retain them as raw/external references.
