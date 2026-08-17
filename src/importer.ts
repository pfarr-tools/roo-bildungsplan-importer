import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {Ajv} from 'ajv';
import {crawl} from './crawler/crawl.js';
import {buildIR} from './ir/build.js';
import {transformPlan} from './roo/transform.js';
import {validateIR, type Validation} from './validation/validate.js';
import {sha256} from './util/hash.js';
import {educationPlanSchema} from './schema.js';

export interface ImportOptions {
  url: string;
  out: string;
  cache: string;
  refresh: boolean;
  maxPages: number;
  debug?: boolean;
  planCode?: string;
}

export interface ImportResult {
  planCode: string;
  status: 'complete' | 'incomplete' | 'failed';
  outputDir: string;
  validation?: Validation;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The single-plan pipeline, shared by both CLI commands. */
export async function importPlan(options: ImportOptions): Promise<ImportResult> {
  let planCode = options.planCode ?? options.url;
  try {
    await mkdir(options.out, {recursive: true});
    const {root, pages} = await crawl(options.url, {
      cacheDir: options.cache,
      refresh: options.refresh,
      maxPages: options.maxPages,
      sourceDir: join(options.out, 'source'),
    });
    const rootPage = pages.get(root);
    if (!rootPage) throw new Error('Root page missing after crawl');

    const ir = buildIR(rootPage, pages);
    planCode = options.planCode ?? ir.planCode;
    const corpus = sha256([...pages.values()].sort((a, b) => a.url.localeCompare(b.url)).map((p) => p.sha256).join('\n'));
    const validation = validateIR(ir);
    const plan: any = transformPlan(ir, {retrievedAt: new Date().toISOString(), corpusSha256: corpus});
    plan.metadata.plan_code = planCode;
    plan.metadata.conversion = {
      complete: validation.complete,
      status: validation.complete ? 'complete' : 'incomplete',
      errors: validation.errors.length,
      warnings: validation.warnings.length,
    };
    const ajv = new Ajv({allErrors: true});
    if (!ajv.validate(educationPlanSchema, plan)) {
      throw new Error(`Output schema validation failed: ${JSON.stringify(ajv.errors)}`);
    }
    await writeFile(join(options.out, 'education-plan.json'), JSON.stringify(plan, null, 2));
    await writeFile(join(options.out, 'validation.json'), JSON.stringify(validation, null, 2));
    await writeFile(join(options.out, 'manifest.json'), JSON.stringify({
      plan_code: planCode,
      root_url: root,
      page_count: pages.size,
      corpus_sha256: corpus,
      complete: validation.complete,
      stats: validation.stats,
    }, null, 2));
    if (options.debug) await writeFile(join(options.out, 'ir.json'), JSON.stringify(ir, null, 2));
    return {planCode, status: validation.complete ? 'complete' : 'incomplete', outputDir: options.out, validation};
  } catch (error) {
    return {planCode, status: 'failed', outputDir: options.out, error: errorMessage(error)};
  }
}
