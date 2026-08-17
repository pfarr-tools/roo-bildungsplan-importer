import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {z} from 'zod';
import {importPlan, type ImportOptions, type ImportResult} from './importer.js';

const planEntry = z.object({
  plan_code: z.string().trim().min(1, 'must be a non-empty string'),
  url: z.string().url().refine((value) => /^https?:$/.test(new URL(value).protocol), 'must use HTTP(S)'),
}).passthrough();
const manifestSchema = z.object({plans: z.array(planEntry)}).passthrough();
export type PlanEntry = z.infer<typeof planEntry>;

export function safePlanDirectory(planCode: string): string {
  const safe = planCode.replace(/[^A-Za-z0-9._-]/g, '_').replace(/^\.+/, '').replace(/\.+$/, '');
  return safe || 'plan';
}

function conciseError(result: ImportResult): string | null {
  if (result.error) return result.error;
  if (result.validation && result.validation.errors.length) return result.validation.errors.slice(0, 5).join('; ');
  return null;
}

async function isCompleteOutput(dir: string, planCode: string): Promise<boolean> {
  try {
    const [validation, manifest] = await Promise.all([
      readFile(join(dir, 'validation.json'), 'utf8').then(JSON.parse),
      readFile(join(dir, 'manifest.json'), 'utf8').then(JSON.parse),
      readFile(join(dir, 'education-plan.json'), 'utf8'),
    ]);
    return manifest.plan_code === planCode && validation.complete === true && validation.errors?.length === 0 && validation.stats?.unparsed_blocks === 0 && manifest.complete === true;
  } catch {
    return false;
  }
}

export interface BatchOptions extends Omit<ImportOptions, 'url' | 'out'> {
  manifestPath: string;
  out: string;
  skipComplete: boolean;
  onProgress?: (message: string) => void;
}

export interface BatchReport {
  source: string;
  requested: number;
  complete: number;
  incomplete: number;
  failed: number;
  plans: Array<{plan_code: string; url: string; status: ImportResult['status']; output: string; validation: string; error: string | null}>;
}

export async function validateManifest(path: string): Promise<PlanEntry[]> {
  let raw: unknown;
  try { raw = JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { throw new Error(`Cannot read manifest ${path}: ${error instanceof Error ? error.message : String(error)}`); }
  const parsed = manifestSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.') || 'root'}: ${i.message}`).join('; ');
    throw new Error(`Invalid plans manifest: ${details}`);
  }
  const seen = new Set<string>();
  for (const plan of parsed.data.plans) {
    if (seen.has(plan.plan_code)) throw new Error(`Invalid plans manifest: duplicate plan_code '${plan.plan_code}'`);
    seen.add(plan.plan_code);
  }
  return parsed.data.plans;
}

export async function importList(options: BatchOptions, importer: (options: ImportOptions) => Promise<ImportResult> = importPlan): Promise<{report: BatchReport; exitCode: 0 | 1 | 2}> {
  const progress = options.onProgress ?? (() => {});
  progress(`Reading manifest: ${options.manifestPath}`);
  const plans = await validateManifest(options.manifestPath);
  progress(`Validated manifest: ${plans.length} plan${plans.length === 1 ? '' : 's'}`);
  const out = resolve(options.out);
  progress(`Preparing output directory: ${out}`);
  await mkdir(out, {recursive: true});
  const report: BatchReport = {source: options.manifestPath, requested: plans.length, complete: 0, incomplete: 0, failed: 0, plans: []};
  const usedDirectories = new Map<string, string>();
  for (const [index, entry] of plans.entries()) {
    progress(`Processing plan ${index + 1}/${plans.length}: ${entry.plan_code}`);
    let directory = safePlanDirectory(entry.plan_code);
    let suffix = 2;
    while (usedDirectories.has(directory) && usedDirectories.get(directory) !== entry.plan_code) directory = `${safePlanDirectory(entry.plan_code)}_${suffix++}`;
    usedDirectories.set(directory, entry.plan_code);
    const dir = join(out, directory);
    let result: ImportResult;
    if (options.skipComplete && await isCompleteOutput(dir, entry.plan_code)) {
      progress(`Skipping complete plan: ${entry.plan_code}`);
      result = {planCode: entry.plan_code, status: 'complete', outputDir: dir, validation: {complete: true, errors: [], warnings: [], stats: {}}};
    } else {
      progress(`Importing plan: ${entry.plan_code}`);
      try {
        result = await importer({url: entry.url, out: dir, cache: resolve(options.cache), refresh: options.refresh, maxPages: options.maxPages, debug: options.debug, planCode: entry.plan_code});
      } catch (error) {
        result = {planCode: entry.plan_code, status: 'failed', outputDir: dir, error: error instanceof Error ? error.message : String(error)};
      }
    }
    report[result.status]++;
    report.plans.push({plan_code: entry.plan_code, url: entry.url, status: result.status, output: `${directory}/education-plan.json`, validation: `${directory}/validation.json`, error: conciseError(result)});
    progress(`Finished plan: ${entry.plan_code} (${result.status})`);
  }
  progress(`Writing import report: ${join(out, 'import-report.json')}`);
  await writeFile(join(out, 'import-report.json'), JSON.stringify(report, null, 2));
  const exitCode = report.failed ? 1 : report.incomplete ? 2 : 0;
  progress(`Import-list finished: ${report.complete} complete, ${report.incomplete} incomplete, ${report.failed} failed`);
  return {report, exitCode};
}

export function reportSummary(report: BatchReport, out: string): string {
  return `Import complete\n\n${report.requested} plans requested\n${report.complete} complete\n ${report.incomplete} incomplete\n ${report.failed} failed\n\nReport: ${join(out, 'import-report.json')}`;
}
