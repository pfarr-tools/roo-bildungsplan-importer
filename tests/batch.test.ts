import {describe, expect, it} from 'vitest';
import {mkdtemp, mkdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {importList, safePlanDirectory, validateManifest} from '../src/batch.js';
import {exportPlans} from '../src/export.js';
import type {ImportResult} from '../src/importer.js';

const temp = () => mkdtemp(join(tmpdir(), 'roo-importer-'));
const ok = (code: string, out: string): ImportResult => ({planCode: code, status: 'complete', outputDir: out, validation: {complete: true, errors: [], warnings: [], stats: {unparsed_blocks: 0}}});

describe('batch importer', () => {
  it('validates a manifest and preserves additional metadata', async () => {
    const dir = await temp();
    const path = join(dir, 'plans.json');
    await writeFile(path, JSON.stringify({plans: [{plan_code: 'A', url: 'https://example.test/a', label: 'kept'}]}));
    expect((await validateManifest(path))[0].plan_code).toBe('A');
  });

  it('rejects duplicate plan codes and malformed URLs', async () => {
    const dir = await temp();
    const duplicate = join(dir, 'duplicate.json');
    await writeFile(duplicate, JSON.stringify({plans: [{plan_code: 'A', url: 'https://example.test/a'}, {plan_code: 'A', url: 'https://example.test/b'}]}));
    await expect(validateManifest(duplicate)).rejects.toThrow(/duplicate plan_code/);
    const malformed = join(dir, 'malformed.json');
    await writeFile(malformed, JSON.stringify({plans: [{plan_code: 'A', url: 'ftp://example.test/a'}]}));
    await expect(validateManifest(malformed)).rejects.toThrow(/HTTP\(S\)/);
  });

  it('isolates incomplete and failed imports and computes aggregate status', async () => {
    const dir = await temp();
    const manifest = join(dir, 'plans.json');
    await writeFile(manifest, JSON.stringify({plans: [
      {plan_code: 'complete', url: 'https://example.test/complete'},
      {plan_code: 'incomplete', url: 'https://example.test/incomplete'},
      {plan_code: 'failed', url: 'https://example.test/failed'},
    ]}));
    const result = await importList({manifestPath: manifest, out: join(dir, 'out'), cache: join(dir, 'cache'), refresh: false, maxPages: 10, skipComplete: false}, async (options) => {
      if (options.planCode === 'incomplete') return {...ok(options.planCode, options.out), status: 'incomplete', validation: {complete: false, errors: ['missing'], warnings: [], stats: {unparsed_blocks: 1}}};
      if (options.planCode === 'failed') return {planCode: options.planCode, status: 'failed', outputDir: options.out, error: 'download failed'};
      return ok(options.planCode, options.out);
    });
    expect(result.exitCode).toBe(1);
    expect(result.report.complete).toBe(1);
    expect(result.report.incomplete).toBe(1);
    expect(result.report.failed).toBe(1);
    expect(result.report.plans).toHaveLength(3);
  });

  it('reports progress for each batch step', async () => {
    const dir = await temp();
    const manifest = join(dir, 'plans.json');
    await writeFile(manifest, JSON.stringify({plans: [{plan_code: 'A', url: 'https://example.test/a'}]}));
    const progress: string[] = [];

    await importList({manifestPath: manifest, out: join(dir, 'out'), cache: join(dir, 'cache'), refresh: false, maxPages: 10, skipComplete: false, onProgress: (message) => progress.push(message)}, async (options) => ok(options.planCode!, options.out));

    expect(progress).toEqual([
      `Reading manifest: ${manifest}`,
      'Validated manifest: 1 plan',
      `Preparing output directory: ${join(dir, 'out')}`,
      'Processing plan 1/1: A',
      'Importing plan: A',
      'Finished plan: A (complete)',
      `Writing import report: ${join(dir, 'out', 'import-report.json')}`,
      'Import-list finished: 1 complete, 0 incomplete, 0 failed',
    ]);
  });

  it('skips only outputs proven complete and uses filesystem-safe names', async () => {
    const dir = await temp();
    const manifest = join(dir, 'plans.json');
    const code = 'A(plan)';
    await writeFile(manifest, JSON.stringify({plans: [{plan_code: code, url: 'https://example.test/a'}]}));
    const output = join(dir, 'out', safePlanDirectory(code));
    await mkdir(output, {recursive: true});
    await writeFile(join(output, 'education-plan.json'), '{}');
    await writeFile(join(output, 'validation.json'), JSON.stringify({complete: true, errors: [], stats: {unparsed_blocks: 0}}));
    await writeFile(join(output, 'manifest.json'), JSON.stringify({plan_code: code, complete: true}));
    let called = false;
    const result = await importList({manifestPath: manifest, out: join(dir, 'out'), cache: join(dir, 'cache'), refresh: false, maxPages: 10, skipComplete: true}, async () => { called = true; return ok(code, output); });
    expect(called).toBe(false);
    expect(result.report.plans[0].status).toBe('complete');
    expect(safePlanDirectory(code)).not.toContain('(');
    expect(result.report.plans[0].plan_code).toBe(code);
  });
});

describe('plan exporter', () => {
  it('exports flat plan files and overwrites an existing plan', async () => {
    const dir = await temp();
    const source = join(dir, 'out', 'imported-plan');
    const destination = join(dir, 'plans');
    await mkdir(source, {recursive: true});
    const plan = {schema_version: '2.0.0', type: 'education_plan', metadata: {plan_code: 'BP_TEST'}};
    await writeFile(join(source, 'education-plan.json'), JSON.stringify(plan));
    await mkdir(destination, {recursive: true});
    await writeFile(join(destination, 'BP_TEST.json'), 'old content');

    const result = await exportPlans({source: join(dir, 'out'), destination});

    expect(result.exported).toBe(1);
    expect(JSON.parse(await readFile(join(destination, 'BP_TEST.json'), 'utf8'))).toEqual(plan);
  });
});
