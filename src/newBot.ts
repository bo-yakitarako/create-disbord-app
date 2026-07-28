import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseNewBotArgs } from './args';
import {
  generateButtonsStub,
  generateDisbordConfig,
  generateDisbordDts,
  generateEnvPlaceholder,
  generateGitignore,
  generateMiseToml,
  generateOxfmtrc,
  generateOxlintConfig,
  generatePackageJson,
  generateReadyEvent,
  generateSchemaStub,
  generateSelectMenusStub,
  generateSlashCommandsStub,
  generateTsconfig,
} from './templates';

function promptYesNo(question: string): boolean {
  const answer = prompt(`${question} (y/N)`);
  return (answer ?? '').trim().toLowerCase().startsWith('y');
}

export async function runNewBot(args: (string | undefined)[], cwd: string): Promise<void> {
  const parsed = parseNewBotArgs(args);

  const targetDir = join(cwd, parsed.name);
  if (existsSync(targetDir)) {
    throw new Error(`disbord: ${parsed.name} は既に存在します（上書きしません）`);
  }

  const db = parsed.db ?? promptYesNo('DBは使用しますか？');
  const coreClass = parsed.coreClass ?? promptYesNo('制御クラス(Core)は使用しますか？');

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
  write('src/disbord.d.ts', generateDisbordDts({ db }));
  write('env/.env.development', generateEnvPlaceholder());
  write('env/.env.production', generateEnvPlaceholder());
  if (db) {
    write('src/db/schema.ts', generateSchemaStub());
  }

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
