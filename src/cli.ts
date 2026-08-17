#!/usr/bin/env node
import {Command} from 'commander';
import {resolve} from 'node:path';
import {importList, reportSummary} from './batch.js';
import {exportPlans} from './export.js';
import {importPlan} from './importer.js';

function addImportOptions(command: Command): Command {
  return command.option('--out <dir>', 'output directory', 'out')
    .option('--cache <dir>', 'cache directory', '.cache/bildungsplaene')
    .option('--refresh', 'ignore HTTP cache and download again')
    .option('--max-pages <n>', 'crawl limit', '250')
    .option('--allow-incomplete', 'exit 0 for an incomplete single-plan import')
    .option('--debug', 'write IR and parser diagnostics');
}

const cli = new Command().name('roo-bildungsplan-import');
addImportOptions(cli.argument('<url>')).action(async (url, _options, command) => {
  const options = command.optsWithGlobals();
  const result = await importPlan({url, out: resolve(options.out), cache: resolve(options.cache), refresh: !!options.refresh, maxPages: Number(options.maxPages), debug: !!options.debug});
  if (result.status === 'failed') throw new Error(result.error);
  console.log(`${result.planCode}: ${result.status.toUpperCase()}`);
  console.log(result.validation?.stats);
  if (result.status === 'incomplete') {
    for (const error of result.validation?.errors ?? []) console.error('ERROR:', error);
    if (!options.allowIncomplete) process.exitCode = 2;
  }
});

const list = cli.command('import-list').argument('<manifest>');
addImportOptions(list).option('--skip-complete', 'skip outputs proven complete by validation and manifest metadata');
list.action(async (manifestPath, _options, command) => {
  const options = command.optsWithGlobals();
  const result = await importList({manifestPath, out: options.out, cache: options.cache, refresh: !!options.refresh, maxPages: Number(options.maxPages), debug: !!options.debug, skipComplete: !!options.skipComplete, onProgress: (message) => console.log(`[import-list] ${message}`)});
  console.log(reportSummary(result.report, options.out));
  process.exitCode = result.exitCode;
});

const exportCommand = cli.command('export-plans')
  .option('--source <dir>', 'importer output directory', 'out')
  .requiredOption('--destination <dir>', 'Roo plans directory');
exportCommand.action(async (_options, command) => {
  const options = command.optsWithGlobals();
  const result = await exportPlans({source: options.source, destination: options.destination});
  console.log(`Exported ${result.exported} plan${result.exported === 1 ? '' : 's'} to ${result.destination}`);
});

cli.parseAsync().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
