import { describe, expect, test } from 'bun:test';
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
} from '../src/templates';

describe('generatePackageJson', () => {
  test('name・dev script・disbordのバージョン範囲依存を含む(npm公開後を想定、workspace:*ではない)', () => {
    const content = JSON.parse(generatePackageJson('my-bot', { db: false }));
    expect(content.name).toBe('my-bot');
    expect(content.scripts.dev).toBe('disbord dev');
    expect(content.dependencies.disbord).toBe('^0.0.1');
  });

  test('db無効時は@libsql/client・drizzle-ormを含まない', () => {
    const content = JSON.parse(generatePackageJson('my-bot', { db: false }));
    expect(content.dependencies['@libsql/client']).toBeUndefined();
    expect(content.dependencies['drizzle-orm']).toBeUndefined();
  });

  test('db有効時は@libsql/client・drizzle-ormをbot自身の依存としても含む(ネイティブバインディングがdisbord側だけでは解決できないため)', () => {
    const content = JSON.parse(generatePackageJson('my-bot', { db: true }));
    expect(content.dependencies['@libsql/client']).toBe('^0.17.2');
    expect(content.dependencies['drizzle-orm']).toBe('^0.45.1');
  });

  test('@typescript/native-previewは含まない(typescript@7系のtscが既にネイティブ実装のため不要。実機確認済み)', () => {
    const content = JSON.parse(generatePackageJson('my-bot', { db: false }));
    expect(content.devDependencies['@typescript/native-preview']).toBeUndefined();
    expect(content.devDependencies.typescript).toBeDefined();
  });
});

describe('generateDisbordConfig', () => {
  test('db/coreClassともに無効な最小構成', () => {
    const source = generateDisbordConfig({ db: false, coreClass: false });
    expect(source).not.toContain('coreClass');
    expect(source).not.toContain('db:');
    expect(source).toContain("import type { Config } from 'disbord';");
    expect(source).toContain('satisfies Config;');
  });

  test('db有効時はdb.enable: trueを含む', () => {
    const source = generateDisbordConfig({ db: true, coreClass: false });
    expect(source).toContain('db: {');
    expect(source).toContain('enable: true,');
  });

  test('coreClass有効時はnullMessage込みで含む', () => {
    const source = generateDisbordConfig({ db: false, coreClass: true });
    expect(source).toContain('coreClass: {');
    expect(source).toContain('nullMessage:');
  });
});

describe('generateOxlintConfig', () => {
  test('相対importを禁止するno-restricted-importsルールを含む', () => {
    const source = generateOxlintConfig();
    expect(source).toContain("import { config } from 'disbord/lint';");
    expect(source).toContain('extends: [config]');
    expect(source).toContain("'no-restricted-imports'");
    expect(source).toContain("'./**'");
    expect(source).toContain("'../**'");
  });

  test('.disbord/*をignorePatternsで除外する(自動生成物なので相対importルールの対象外にする)', () => {
    expect(generateOxlintConfig()).toContain(`ignorePatterns: ['.disbord/*']`);
  });
});

describe('generateTsconfig', () => {
  test('@/*エイリアスがsrc/*にマッピングされている', () => {
    const content = JSON.parse(generateTsconfig());
    expect(content.compilerOptions.paths).toEqual({ '@/*': ['./src/*'] });
  });

  test('baseUrlは含まない(TypeScript v7で廃止されたオプションのため。tsgoでTS5102を実機確認済み)', () => {
    const content = JSON.parse(generateTsconfig());
    expect(content.compilerOptions.baseUrl).toBeUndefined();
  });
});

describe('generateOxfmtrc', () => {
  test('.disbord/*をignorePatternsに含む', () => {
    const content = JSON.parse(generateOxfmtrc());
    expect(content.ignorePatterns).toContain('.disbord/*');
  });
});

describe('generateDisbordDts', () => {
  test('db無効時はschema関連の行を含まない', () => {
    const source = generateDisbordDts({ db: false });
    expect(source).not.toContain('schema');
  });

  test('db有効時はschemaのimportとRegistryフィールドを含む', () => {
    const source = generateDisbordDts({ db: true });
    expect(source).toContain(`import type { schema } from '@/db/schema';`);
    expect(source).toContain('schema: typeof schema;');
  });

  test('components importは@/絶対パスを使う', () => {
    const source = generateDisbordDts({ db: false });
    expect(source).toContain(`from '@/components/buttons'`);
    expect(source).toContain(`from '@/components/selectMenus'`);
    expect(source).toContain(`from '@/components/slashCommands'`);
  });
});

describe('その他の静的テンプレート', () => {
  test('generateReadyEvent: Client<true>を引数に取る', () => {
    expect(generateReadyEvent()).toContain('client: Client<true>');
  });

  test('generateButtonsStub/SelectMenusStub/SlashCommandsStub: 空のRegistrationを満たす', () => {
    expect(generateButtonsStub()).toContain('satisfies ButtonRegistration');
    expect(generateSelectMenusStub()).toContain('satisfies SelectMenuRegistration');
    expect(generateSlashCommandsStub()).toContain('satisfies SlashCommandRegistration');
  });

  test('generateSchemaStub: schemaという名前でexportする', () => {
    expect(generateSchemaStub()).toContain('export const schema = {};');
  });

  test('generateEnvPlaceholder: TOKEN/CLIENT_IDの空プレースホルダー', () => {
    const content = generateEnvPlaceholder();
    expect(content).toContain('TOKEN=');
    expect(content).toContain('CLIENT_ID=');
  });

  test('generateGitignore: node_modules/dist/.disbord/env keysを含む', () => {
    const content = generateGitignore();
    expect(content).toContain('node_modules/');
    expect(content).toContain('dist/');
    expect(content).toContain('.disbord/');
    expect(content).toContain('env/.env.keys.*');
  });

  test('generateMiseToml: bunとdotenvxを含む', () => {
    const content = generateMiseToml();
    expect(content).toContain('bun =');
    expect(content).toContain('dotenvx =');
  });
});
