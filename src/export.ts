import {mkdir, readdir, readFile, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';

interface EducationPlan {
  metadata?: {
    plan_code?: unknown;
  };
}

export interface ExportOptions {
  source: string;
  destination: string;
}

export interface ExportResult {
  source: string;
  destination: string;
  exported: number;
  plans: string[];
}

function planCodeFrom(value: EducationPlan, file: string): string {
  const planCode = value.metadata?.plan_code;
  if (typeof planCode !== 'string' || !planCode.trim()) {
    throw new Error(`Missing metadata.plan_code in ${file}`);
  }
  if (planCode.includes('/') || planCode.includes('\\')) {
    throw new Error(`Invalid metadata.plan_code in ${file}: path separators are not allowed`);
  }
  return planCode;
}

/** Export importer output as Roo's flat plans/<plan_code>.json collection. */
export async function exportPlans(options: ExportOptions): Promise<ExportResult> {
  const source = resolve(options.source);
  const destination = resolve(options.destination);
  const entries = await readdir(source, {withFileTypes: true});
  const plans: string[] = [];

  await mkdir(destination, {recursive: true});
  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const input = join(source, entry.name, 'education-plan.json');
    let plan: EducationPlan;
    try {
      plan = JSON.parse(await readFile(input, 'utf8')) as EducationPlan;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw new Error(`Cannot read ${input}: ${error instanceof Error ? error.message : String(error)}`);
    }

    const planCode = planCodeFrom(plan, input);
    await writeFile(join(destination, `${planCode}.json`), JSON.stringify(plan, null, 2));
    plans.push(planCode);
  }

  return {source, destination, exported: plans.length, plans};
}
