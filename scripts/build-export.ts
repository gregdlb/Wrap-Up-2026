/**
 * Generates `export/`, the only folder the app takes. Per component:
 * one self-contained ES module (code + styles, gsap stays an import), its type declarations and its images.
 */
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { $ } from 'bun';

const root = join(import.meta.dir, '..');
const source = join(root, 'src');
const target = join(root, 'export');

const components = [
  { name: 'FirstVisitCard', folder: 'first-visit-card' },
  { name: 'VisitsCount', folder: 'visits-count' },
  { name: 'HoursClock', folder: 'hours-clock' },
  { name: 'BusiestMonthCard', folder: 'busiest-month-card' },
  { name: 'FallingLeaves', folder: 'falling-leaves', assets: true },
  { name: 'PersonalityCard', folder: 'personality-card' },
  { name: 'WeeksCard', folder: 'weeks-card' },
  { name: 'CaredForCard', folder: 'cared-for-card' },
  { name: 'PayCard', folder: 'pay-card' },
  { name: 'MoneyRain', folder: 'money-rain' },
  { name: 'TopCaregiverCard', folder: 'top-caregiver-card' },
  { name: 'ThankYouCard', folder: 'thank-you-card' },
  { name: 'SoundButton', folder: 'sound-button' },
  { name: 'WrapUpAssets', folder: 'preload' },
  { name: 'WrapUpText', folder: 'text' },
];

interface Declaration {
  name: string;
  text: string;
}

const DECLARATION_START = /^(?:export )?(?:declare )?(?:function|const|interface|type|class|enum) ([A-Za-z_$][\w$]*)/;
/** `import { a, type B } from './x';` and `export type { C } from '../y';`, also when wrapped over lines. */
const RELATIVE_FROM = /^(import|export) (?:type )?\{([^}]*)\} from '(\.[^']*)';$/gm;

/** Splits a compiler-emitted .d.ts into its top-level declarations, each with the JSDoc above it. */
function parseDeclarations(text: string): Declaration[] {
  const declarations: Declaration[] = [];
  let comment: string[] = [];
  let current: Declaration | null = null;

  for (const line of text.split('\n')) {
    const start = line.match(DECLARATION_START);
    if (start) {
      current = { name: start[1]!, text: [...comment, line].join('\n') };
      declarations.push(current);
      comment = [];
    } else if (line.startsWith('/**') || (comment.length > 0 && !comment.at(-1)!.endsWith('*/'))) {
      comment.push(line);
    } else if (current && line !== '' && !line.startsWith('import ') && !line.startsWith('export {')) {
      current.text += `\n${line}`;
    }
  }
  return declarations;
}

/**
 * Merges the declarations a component's entry reaches into one file:
 * what the entry exports stays exported, types those need come along unexported, everything else is dropped.
 */
async function bundleDeclarations(declarationRoot: string, entry: string): Promise<string> {
  const publicNames = new Set<string>();
  const declarations = new Map<string, Declaration>();
  const queue = [entry];
  const seen = new Set(queue);

  for (const file of queue) {
    const text = await readFile(join(declarationRoot, `${file}.d.ts`), 'utf8');
    for (const [, keyword, names, from] of text.matchAll(RELATIVE_FROM)) {
      const imported = join(dirname(file), from!);
      if (!seen.has(imported)) queue.push(imported);
      seen.add(imported);
      if (file !== entry || keyword !== 'export') continue;
      for (const name of names!.split(',')) {
        const exported = name.replace('type ', '').trim();
        if (exported) publicNames.add(exported);
      }
    }
    for (const declaration of parseDeclarations(text)) declarations.set(declaration.name, declaration);
  }

  const kept = new Set<string>();
  const pending = [...publicNames];
  for (const name of pending) {
    const declaration = declarations.get(name);
    if (!declaration) throw new Error(`${entry}: exported "${name}" has no declaration`);
    if (kept.has(name)) continue;
    kept.add(name);
    for (const word of declaration.text.match(/[A-Za-z_$][\w$]*/g) ?? []) {
      if (declarations.has(word) && !kept.has(word)) pending.push(word);
    }
  }

  const blocks = [...declarations.values()]
    .filter((declaration) => kept.has(declaration.name))
    .map(({ name, text }) => {
      const line = new RegExp(`^(export )?(?=(?:declare )?\\w+ ${name}\\b)`, 'm');
      return text.replace(line, publicNames.has(name) ? 'export ' : '');
    });
  return `${blocks.join('\n\n')}\n`;
}

await rm(target, { recursive: true, force: true });
await mkdir(join(target, 'assets'), { recursive: true });

const declarationRoot = await mkdtemp(join(tmpdir(), 'wrap-up-types-'));
await $`bunx tsc --noEmit false --declaration --emitDeclarationOnly --rootDir ${root} --outDir ${declarationRoot}`.cwd(root);

for (const component of components) {
  const result = await Bun.build({
    entrypoints: [join(source, component.folder, 'index.ts')],
    outdir: target,
    naming: `${component.name}.js`,
    format: 'esm',
    target: 'browser',
    external: ['gsap'],
  });
  if (!result.success) {
    console.error(result.logs.join('\n'));
    process.exit(1);
  }
  const types = await bundleDeclarations(join(declarationRoot, 'src'), join(component.folder, 'index'));
  await writeFile(join(target, `${component.name}.d.ts`), types);
  if (component.assets) await cp(join(source, component.folder, 'assets'), join(target, 'assets'), { recursive: true });
  console.log(`export/${component.name}.js + .d.ts`);
}
await rm(declarationRoot, { recursive: true, force: true });

// The bundled declarations must stand on their own in the app, without this repo's sources.
const declarationFiles = components.map((component) => join(target, `${component.name}.d.ts`));
await $`bunx tsc --ignoreConfig --noEmit --strict --skipLibCheck false ${declarationFiles}`.cwd(root);

// Images shared by several components, e.g. the heart on the stickers.
await cp(join(source, 'shared', 'assets'), join(target, 'assets'), { recursive: true });

await cp(join(source, 'README.md'), join(target, 'README.md'));
console.log('export/README.md');
