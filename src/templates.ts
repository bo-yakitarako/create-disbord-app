/**
 * 生成するbotが依存する`disbord`のバージョン範囲。
 * disbordを新しいバージョンで公開したら、このバージョン範囲も手動で追従させる。
 */
const DISBORD_VERSION_RANGE = '^0.0.2';

/**
 * db有効時は`@libsql/client`・`dayjs`・`drizzle-kit`・`drizzle-orm`をbot自身の依存にも明示する。
 * disbord自身の内部依存として既に入っているが、それだけでは足りない:
 * - `@libsql/client`はプラットフォーム別ネイティブバインディングを持ち、bun buildで
 *   バンドルしきれず`--external`扱いになる(disbord/src/cli/build.ts参照)。dist/main.jsの
 *   実行時、この`require('@libsql/client')`はbot自身のディレクトリツリー基準で解決されるため、
 *   disbord側にしか入っていないとデプロイ先で解決できない(実機で確認済み)
 * - `disbord migrate`が`src/db/models/*.ts`を動的importしてschema.ts・migrationファイルを
 *   生成する。この際に内部で使う`drizzle-orm/sqlite-core`・`drizzle-kit/api`をbot自身の
 *   モジュール解決・型チェックのために必要とする
 * - `mode: 'timestamp_ms'`のカラムはgetter越しに`dayjs`でラップされる(`Model`本体の
 *   `createdAt`/`updatedAt`も同様)ため、モデル側で`accessor xxx: Dayjs;`と型注釈する際に
 *   bot自身の型チェックのために`dayjs`の型解決が必要
 */
export function generatePackageJson(name: string, options: { db: boolean }): string {
  return (
    JSON.stringify(
      {
        name,
        version: '0.0.1',
        private: true,
        type: 'module',
        scripts: {
          dev: 'disbord dev',
          build: 'disbord build',
          fmt: 'oxfmt --write src test',
          lint: 'oxlint -c oxlint.config.ts --fix',
          commands: 'disbord commands push',
          'commands:delete': 'disbord commands delete',
          'gen:event': 'disbord generate event',
          'gen:model': 'disbord generate model',
          env: 'disbord env',
          ...(options.db ? { migrate: 'disbord migrate' } : {}),
          help: 'disbord help',
        },
        dependencies: {
          disbord: DISBORD_VERSION_RANGE,
          'discord.js': '^14.27.0',
          ...(options.db
            ? {
                '@libsql/client': '^0.17.2',
                dayjs: '^1.11.19',
                'drizzle-kit': '^0.31.10',
                'drizzle-orm': '^0.45.1',
              }
            : {}),
        },
        devDependencies: {
          '@types/bun': 'latest',
          // typescript@7系のtscは既にネイティブ実装への薄いシムになっているため、
          // @typescript/native-preview(tsgoコマンド)は不要(実機確認済み)。
          typescript: '^7.0.2',
          oxlint: 'latest',
          oxfmt: '^0.61.0',
        },
      },
      null,
      2,
    ) + '\n'
  );
}

export type DisbordConfigOptions = { db: boolean; coreClass: boolean };

/**
 * disbord.config.sample.ts を土台に、db/coreClassが有効なときだけ該当キーを含める。
 * nullMessage/botErrorMessageはプレースホルダーで、ユーザーが後から編集する想定。
 */
export function generateDisbordConfig(options: DisbordConfigOptions): string {
  const lines = [
    "import type { Config } from 'disbord';",
    '',
    'export default {',
    "  intents: ['Guilds', 'GuildMessages'],",
  ];

  if (options.coreClass) {
    lines.push('  coreClass: {', '    enable: true,', "    nullMessage: 'まだ始まっていません',", '  },');
  }
  if (options.db) {
    lines.push('  db: {', '    enable: true,', '  },');
  }

  lines.push("  botErrorMessage: 'エラーが発生しました',", '} satisfies Config;', '');
  return lines.join('\n');
}

export function generateOxfmtrc(): string {
  return (
    JSON.stringify(
      {
        $schema: './node_modules/oxfmt/configuration_schema.json',
        printWidth: 120,
        tabWidth: 2,
        useTabs: false,
        semi: true,
        singleQuote: true,
        trailingComma: 'all',
        bracketSpacing: true,
        arrowParens: 'always',
        sortImports: {
          groups: [['builtin'], ['external'], ['internal'], ['parent', 'sibling', 'index']],
          sortSideEffects: false,
          ignoreCase: true,
          newlinesBetween: false,
        },
        ignorePatterns: ['node_modules/*', 'dist/*', '.disbord/*'],
      },
      null,
      2,
    ) + '\n'
  );
}

/**
 * 相対import禁止(no-restricted-imports)・.disbord/*の除外は disbord/lint 側の共有configに
 * 含まれているため、生成物はextendsするだけでよい。
 */
export function generateOxlintConfig(): string {
  return `import { config } from 'disbord/lint';

export default {
  extends: [config],
};
`;
}

export function generateTsconfig(): string {
  return (
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ESNext',
          module: 'Preserve',
          lib: ['ESNext'],
          moduleDetection: 'force',
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          verbatimModuleSyntax: true,
          isolatedModules: true,
          noEmit: true,
          skipLibCheck: true,
          types: ['bun'],
          // TypeScript v7は`baseUrl`を廃止しているため指定しない(tsgoで実機確認済み: TS5102)。
          // pathsはtsconfig.json自身の場所を基準に解決される。
          paths: { '@/*': ['./src/*'] },
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: false,
          noFallthroughCasesInSwitch: true,
          noUncheckedIndexedAccess: true,
          noImplicitOverride: true,
        },
        include: ['src', 'test'],
      },
      null,
      2,
    ) + '\n'
  );
}

export function generateMiseToml(): string {
  // dotenvxはdisbordのnpm依存(@dotenvx/dotenvx)から解決するため、bot側でmise経由の
  // dotenvx導入は不要。
  return `[tools]
bun = "latest"
`;
}

export function generateGitignore(): string {
  return `node_modules/
dist/
.disbord/
env/.env.keys.*
`;
}

export function generateReadyEvent(): string {
  return `import type { Client } from 'discord.js';

export default async function (client: Client<true>) {
  console.log(\`\${client.user.tag} が起動しました\`);
}
`;
}

export function generateButtonsStub(): string {
  return `import type { ButtonRegistration } from 'disbord';

export default {} satisfies ButtonRegistration;
`;
}

export function generateSelectMenusStub(): string {
  return `import type { SelectMenuRegistration } from 'disbord';

export default {} satisfies SelectMenuRegistration;
`;
}

export function generateSlashCommandsStub(): string {
  return `import type { SlashCommandRegistration } from 'disbord';

export default {} satisfies SlashCommandRegistration;
`;
}

const DEFAULT_CORE_CLASS_NAME = 'Core';

/**
 * ButtonRegistration/SelectMenuRegistrationのexecute第2引数(core)は、生成後この型を
 * ユーザーが自由に拡張していく想定のため中身は空クラスのみ(registration/Core.tsのモックアップと違い、
 * サンプルメソッドは持たせない)。クラス名・ファイル名は`--core-class=Name`・対話フローで指定した名前になる
 * (未指定時のデフォルトは`Core`。ファイルはクラス名と同じ`src/${className}.ts`に生成される)。
 */
export function generateCoreStub(className: string = DEFAULT_CORE_CLASS_NAME): string {
  return `export class ${className} {}
`;
}

/**
 * module augmentationの受け口。CLIが1回だけ生成し、以後さわらない想定(disbord.md「components配下」節)。
 * coreClass有効時はRegistry['core']にsrc/{ClassName}.tsの型を流し込み、ButtonRegistration/
 * SelectMenuRegistrationのexecute第2引数(core)にジェネリクスを書かなくても自動で反映されるようにする。
 */
export function generateDisbordDts(options: { db: boolean; coreClass: boolean; coreClassName?: string }): string {
  const coreClassName = options.coreClassName ?? DEFAULT_CORE_CLASS_NAME;
  const coreImportLine = options.coreClass ? `\nimport type { ${coreClassName} } from '@/${coreClassName}';` : '';
  const coreField = options.coreClass ? `\n    core: InstanceType<typeof ${coreClassName}>;` : '';
  const schemaImportLine = options.db ? `\nimport type { schema } from '@/db/schema';` : '';
  const schemaField = options.db ? '\n    schema: typeof schema;' : '';

  return `import type buttons from '@/components/buttons';
import type selectMenus from '@/components/selectMenus';
import type slashCommands from '@/components/slashCommands';${coreImportLine}${schemaImportLine}

declare module 'disbord' {
  interface Registry {
    buttons: typeof buttons;
    selectMenus: typeof selectMenus;
    slashCommands: typeof slashCommands;${coreField}${schemaField}
  }
}
`;
}

export function generateEnvPlaceholder(): string {
  return `TOKEN=
CLIENT_ID=
`;
}
