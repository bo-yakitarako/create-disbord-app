import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseNewBotArgs } from './args';
import {
  generateButtonsStub,
  generateCoreStub,
  generateDisbordConfig,
  generateDisbordDts,
  generateEnvPlaceholder,
  generateGitignore,
  generateMiseToml,
  generateOxfmtrc,
  generateOxlintConfig,
  generatePackageJson,
  generateReadyEvent,
  generateSelectMenusStub,
  generateSlashCommandsStub,
  generateTsconfig,
} from './templates';

const DEFAULT_CORE_CLASS_NAME = 'Core';
const CORE_CLASS_NAME_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function promptYesNo(question: string): boolean {
  const answer = prompt(`${question} (y/N)`);
  return (answer ?? '').trim().toLowerCase().startsWith('y');
}

function promptCoreClassName(): string {
  const answer = prompt(`Coreクラスの名前を入力してください(無記入の場合は「${DEFAULT_CORE_CLASS_NAME}」になります)`);
  const trimmed = (answer ?? '').trim();
  if (trimmed === '') {
    return DEFAULT_CORE_CLASS_NAME;
  }
  if (!CORE_CLASS_NAME_PATTERN.test(trimmed)) {
    throw new Error(
      `disbord: Coreクラスの名前が不正です（"${trimmed}"）。クラス名として使える文字列を指定してください`,
    );
  }
  return trimmed;
}

/**
 * --core-class=Nameなら質問なしでそのまま確定、--core-class単体なら質問はスキップしつつ名前だけ聞き、
 * 未指定ならYes/No込みで対話フローに委ねる(Yesの場合のみ続けて名前を聞く)。
 */
function resolveCoreClass(parsed: string | true | undefined): { enabled: boolean; name: string } {
  if (typeof parsed === 'string') {
    return { enabled: true, name: parsed };
  }
  if (parsed === true) {
    return { enabled: true, name: promptCoreClassName() };
  }
  const enabled = promptYesNo('制御クラス(Core)は使用しますか？');
  return { enabled, name: enabled ? promptCoreClassName() : DEFAULT_CORE_CLASS_NAME };
}

export async function runNewBot(args: (string | undefined)[], cwd: string): Promise<void> {
  const parsed = parseNewBotArgs(args);

  const targetDir = join(cwd, parsed.name);
  if (existsSync(targetDir)) {
    throw new Error(`disbord: ${parsed.name} は既に存在します（上書きしません）`);
  }

  const db = parsed.db ?? promptYesNo('DBは使用しますか？');
  const { enabled: coreClass, name: coreClassName } = resolveCoreClass(parsed.coreClass);

  const write = (relativePath: string, content: string) => {
    const filePath = join(targetDir, relativePath);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  };

  write('package.json', generatePackageJson(parsed.name, { db }));
  write('disbord.config.ts', generateDisbordConfig({ db, coreClass }));
  write('.oxfmtrc.json', generateOxfmtrc());
  write('oxlint.config.ts', generateOxlintConfig());
  write('tsconfig.json', generateTsconfig());
  write('mise.toml', generateMiseToml());
  write('.gitignore', generateGitignore());
  write('src/events/ready.ts', generateReadyEvent());
  write('src/components/buttons.ts', generateButtonsStub());
  write('src/components/selectMenus.ts', generateSelectMenusStub());
  write('src/components/slashCommands.ts', generateSlashCommandsStub());
  if (coreClass) {
    write(`src/${coreClassName}.ts`, generateCoreStub(coreClassName));
  }
  write('src/disbord.d.ts', generateDisbordDts({ db, coreClass, coreClassName }));
  write('env/.env.development', generateEnvPlaceholder());
  write('env/.env.production', generateEnvPlaceholder());

  console.log(`disbord: ${parsed.name} を生成しました`);

  const install = Bun.spawn(['bun', 'install'], { cwd: targetDir, stdio: ['inherit', 'inherit', 'inherit'] });
  const exitCode = await install.exited;
  if (exitCode !== 0) {
    console.error(
      `disbord: bun install に失敗しました（終了コード ${exitCode}）。${parsed.name} 配下で手動実行してください`,
    );
  }

  console.log(`次のコマンドで開発を始められます:\n  cd ${parsed.name}\n  bun run dev`);
}
