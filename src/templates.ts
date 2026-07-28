/**
 * db有効時は`@libsql/client`(と`drizzle-orm`)をbot自身の依存にも明示する。
 * disbord自身の内部依存として既に入っているが、それだけでは足りない:
 * - `@libsql/client`はプラットフォーム別ネイティブバインディングを持ち、bun buildで
 *   バンドルしきれず`--external`扱いになる(disbord/src/cli/build.ts参照)。dist/main.jsの
 *   実行時、この`require('@libsql/client')`はbot自身のディレクトリツリー基準で解決されるため、
 *   disbord側にしか入っていないとデプロイ先で解決できない(実機で確認済み)
 * - 手書きのsrc/db/schema.tsが`drizzle-orm/sqlite-core`等を直接importする際、
 *   bot自身のモジュール解決・型チェックのために必要
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
        },
        dependencies: {
          disbord: 'workspace:*',
          ...(options.db ? { '@libsql/client': '^0.17.2', 'drizzle-orm': '^0.45.1' } : {}),
        },
        devDependencies: {
          '@types/bun': 'latest',
          // typescript@7系のtscは既にネイティブ実装への薄いシムになっているため、
          // @typescript/native-preview(tsgoコマンド)は不要(実機確認済み)。
          typescript: '^7.0.2',
          oxlint: 'latest',
          oxfmt: '^0.42.0',
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
  const lines = ["import type { Config } from 'disbord';", '', 'export default {', "  intents: ['Guilds', 'GuildMessages'],"];

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
 * 相対import(./や../)を禁止し@/絶対パスimportを必須にする(ユーザー指示)。
 * この制限はdisbord/lint側の共有configには入れない(disbord自身は@/エイリアスを持たず
 * 相対importで書かれているため、共有configに入れるとdisbord自身のlintが壊れる)。
 * patternsは"./*"のような1階層のみのglobだと"../../foo"のようなネストを見逃すため"**"を使う。
 */
export function generateOxlintConfig(): string {
  return `import { config } from 'disbord/lint';

export default {
  extends: [config],
  rules: {
    'no-restricted-imports': ['error', { patterns: ['./**', '../**'] }],
  },
  ignorePatterns: ['.disbord/*'],
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
  return `[tools]
bun = "latest"
dotenvx = "latest"
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

/**
 * module augmentationの受け口。CLIが1回だけ生成し、以後さわらない想定(disbord.md「components配下」節)。
 */
export function generateDisbordDts(options: { db: boolean }): string {
  const schemaImportLine = options.db ? `\nimport type { schema } from '@/db/schema';` : '';
  const schemaField = options.db ? '\n    schema: typeof schema;' : '';

  return `import type buttons from '@/components/buttons';
import type selectMenus from '@/components/selectMenus';
import type slashCommands from '@/components/slashCommands';${schemaImportLine}

declare module 'disbord' {
  interface Registry {
    buttons: typeof buttons;
    selectMenus: typeof selectMenus;
    slashCommands: typeof slashCommands;${schemaField}
  }
}
`;
}

export function generateSchemaStub(): string {
  return `export const schema = {};
`;
}

export function generateEnvPlaceholder(): string {
  return `TOKEN=
CLIENT_ID=
`;
}
