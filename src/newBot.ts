import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { promptCoreClassName, promptYesNo } from 'disbord/prompt';
import {
  generateDisbordConfig,
  generateDisbordDts,
  generateEnvPlaceholder,
  generateGitignore,
  generateLefthookConfig,
  generateMiseToml,
  generateOxfmtrc,
  generateOxlintConfig,
  generatePackageJson,
  generateReadme,
  generateReadyEvent,
  generateSlashCommandsStub,
  generateTsconfig,
} from 'disbord/scaffold';
import { parseNewBotArgs } from './args';

const DEFAULT_CORE_CLASS_NAME = 'Core';

/**
 * `--core-class=Name`なら質問なしでそのまま確定、`--core-class`単体なら質問はスキップしつつ名前だけ聞き、
 * 未指定ならYes/No込みで対話フローに委ねる(Yesの場合のみ続けて名前を聞く)。
 */
function resolveCoreClass(parsed: string | true | undefined): { enabled: boolean; name: string } {
  if (typeof parsed === 'string') {
    return { enabled: true, name: parsed };
  }
  if (parsed === true) {
    return { enabled: true, name: promptCoreClassName(DEFAULT_CORE_CLASS_NAME) };
  }
  const enabled = promptYesNo('制御クラス(Core)は使用しますか？');
  return { enabled, name: enabled ? promptCoreClassName(DEFAULT_CORE_CLASS_NAME) : DEFAULT_CORE_CLASS_NAME };
}

/**
 * `disbord`はワークスペース内モノレポに限らず`create-disbord-app`のnpm依存としても
 * 解決できる(package.jsonのdependenciesに昇格済み)ため、bin.tsへのパスをここで解決して
 * 子プロセスとして`disbord enable`を実行する。
 */
function resolveDisbordBinPath(): string {
  const pkgJsonPath = Bun.resolveSync('disbord/package.json', import.meta.dir);
  return join(dirname(pkgJsonPath), 'src/cli/bin.ts');
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

  // `--db`/`--core-class`に依存する生成処理は一切ここでは行わない。base skeletonを
  // 書き出した後、`disbord enable`に丸ごと委譲する(disbord.md「CLI・配布」節参照)。
  write('package.json', generatePackageJson(parsed.name));
  write('README.md', generateReadme(parsed.name));
  write('disbord.config.ts', generateDisbordConfig());
  write('.oxfmtrc.json', generateOxfmtrc());
  write('oxlint.config.ts', generateOxlintConfig());
  write('tsconfig.json', generateTsconfig());
  write('mise.toml', generateMiseToml());
  write('.gitignore', generateGitignore());
  write('lefthook.yml', generateLefthookConfig());
  write('src/events/ready.ts', generateReadyEvent());
  write('src/components/slashCommands.ts', generateSlashCommandsStub());
  write(
    '.disbord/disbord.d.ts',
    generateDisbordDts({ db: false, coreClass: false, buttons: false, selectMenus: false }),
  );
  write('env/.env.development', generateEnvPlaceholder('development'));
  write('env/.env.production', generateEnvPlaceholder('production'));

  console.log(`disbord: ${parsed.name} を生成しました`);

  // `disbord enable`は1回の呼び出しにつきdb/core-classのどちらか一方しか有効化できないため、
  // 両方指定された場合は2回に分けて呼び出す。
  const enableTargets: string[][] = [];
  if (db) enableTargets.push(['db']);
  if (coreClass) enableTargets.push(['core-class', coreClassName]);

  for (const targetArgs of enableTargets) {
    const enable = Bun.spawn(['bun', resolveDisbordBinPath(), 'enable', ...targetArgs], {
      cwd: targetDir,
      stdio: ['inherit', 'inherit', 'inherit'],
    });
    const enableExitCode = await enable.exited;
    if (enableExitCode !== 0) {
      throw new Error(`disbord: ${targetArgs[0]}の有効化に失敗しました（終了コード ${enableExitCode}）`);
    }
  }

  // `bun install`のpostinstall(`lefthook install --reset-hooks-path`)がgitリポジトリを
  // 要求するため、`git init`は必ずbun installより先に実行する。
  const gitInit = Bun.spawn(['git', 'init'], { cwd: targetDir, stdio: ['inherit', 'inherit', 'inherit'] });
  const gitInitExitCode = await gitInit.exited;
  if (gitInitExitCode !== 0) {
    console.error(
      `disbord: git init に失敗しました（終了コード ${gitInitExitCode}）。${parsed.name} 配下で手動実行してください`,
    );
  }

  const install = Bun.spawn(['bun', 'install'], { cwd: targetDir, stdio: ['inherit', 'inherit', 'inherit'] });
  const exitCode = await install.exited;
  if (exitCode !== 0) {
    console.error(
      `disbord: bun install に失敗しました（終了コード ${exitCode}）。${parsed.name} 配下で手動実行してください`,
    );
  }

  // oxfmtはbot自身のdevDependencyのため、bun install完了後（node_modulesに解決できる状態になってから）
  // 最後に一括でかける。package.json/tsconfig.json等の生成物・disbord enableが追記したファイルも
  // まとめて整形される。
  if (exitCode === 0) {
    const fmt = Bun.spawn(['bunx', 'oxfmt', '--write', '.'], {
      cwd: targetDir,
      stdio: ['inherit', 'inherit', 'inherit'],
    });
    const fmtExitCode = await fmt.exited;
    if (fmtExitCode !== 0) {
      console.error(
        `disbord: oxfmt --write に失敗しました（終了コード ${fmtExitCode}）。${parsed.name} 配下で 'bunx oxfmt --write .' を手動実行してください`,
      );
    }
  }

  console.log(`次のコマンドで開発を始められます:\n  cd ${parsed.name}\n  bun run dev`);
}
