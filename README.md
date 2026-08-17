# Roo Bildungsplan Importer

HTML-first importer for `bildungsplaene-bw.de`. It crawls an official plan starting from its root page, caches every source page, converts the HTML into a neutral intermediate representation (IR), transforms that IR into Roo's generic `education_plan` JSON and validates completeness.

## Install

```bash
npm install
npm run build
```

## Use

```bash
node dist/cli.js \
  'https://www.bildungsplaene-bw.de/,Lde/BP2016BW_ALLG_GS_RRK' \
  --out out/gs-rrk
```

During development:

```bash
npm run dev -- 'https://www.bildungsplaene-bw.de/,Lde/BP2016BW_ALLG_SEK1_REV' --out out/sek1-rev
```

Useful options:

```text
--out <dir>          output directory (default: out)
--cache <dir>        cache directory (default: .cache/bildungsplaene)
--refresh            ignore HTTP cache and download again
--max-pages <n>      crawl safety limit (default: 250)
--allow-incomplete   exit 0 even if validation marks the import incomplete
--debug              write IR and parser diagnostics
```

The output contains `education-plan.json`, `manifest.json`, `validation.json`, and a `source/` directory with the exact HTML pages used for the conversion.

## Batch import

Import every entry in the supplied manifest with the same pipeline:

```bash
npm run dev -- import-list plans.json --out ./out
node dist/cli.js import-list plans.json --out ./out
```

The manifest must contain a `plans` array. Each entry needs a unique, non-empty `plan_code` and an HTTP(S) `url`; other fields are allowed and ignored by the importer. The supplied `plans.json` is the recommended complete import manifest:

```json
{
  "plans": [
    {"plan_code": "BP2016BW_ALLG_GS_REV", "url": "https://www.bildungsplaene-bw.de/,Lde/BP2016BW_ALLG_GS_REV"}
  ]
}
```

Each plan is written below a filesystem-safe version of its `plan_code`; the original code remains in `education-plan.json` metadata, `manifest.json`, and the report. Batch imports are sequential by default and reuse the HTML cache. Use `--refresh` to redownload pages, and `--skip-complete` to skip a plan only when its existing education plan, validation, and manifest files prove that validation completed without errors or unparsed blocks.

The batch root contains `import-report.json`, with one concise result per requested plan. A plan is `complete` only when completeness validation succeeds, `incomplete` when a usable dataset was written but validation found missing/unparsed content, and `failed` when crawling or parsing could not produce a usable dataset. The batch exit codes are 0 when all plans complete, 2 when there are incomplete plans but no failures, and 1 when at least one plan fails. Inspect `plans[].error` and each plan's `validation.json` for details.

The output layout is:

```text
out/
├── BP2016BW_ALLG_GS_REV/{education-plan.json,manifest.json,validation.json,source/}
├── .../
└── import-report.json
```

To import the complete supplied manifest after building, run `node dist/cli.js import-list plans.json --out ./out --skip-complete` on reruns.

## Export Roo plans

Convert an existing importer output into Roo's flat `plans/` collection:

```bash
npm run export-plans -- --source ./out --destination ../roo/data/bildungsplaene/plans
```

Each `out/<plan-directory>/education-plan.json` is written as `<plan_code>.json` in the destination. The destination is created when needed, and an existing file with the same plan code is overwritten.

## Architecture

```text
Root URL
  -> crawler/discovery
  -> cached HTML corpus
  -> HTML parser
  -> neutral IR
  -> Roo transformer
  -> completeness validator
  -> education-plan.json
```

The crawler discovers plan-internal links from the official navigation. The parser recognizes numbered headings and structured tables; it does **not** rely on domain titles such as “Mensch”, “Bibel”, etc.

See [SCHEMA.md](SCHEMA.md) and [PARSER.md](PARSER.md).
