# create-disbord-app

[`disbord`](https://github.com/bo-yakitarako/disbord)を使ったDiscord bot雛形を生成するCLI。`disbord`のセットアップ役という位置づけで、生成後のCLI操作（`disbord dev`等）や設定ファイルの詳細は`disbord`のREADMEを参照してください。

## 使い方

```bash
bunx create-disbord-app <name> [--db] [--core-class[=ClassName]]
```

- `<name>`: 生成したいbot名（`new-bot`のようなサブコマンドは無く、そのまま位置引数として渡す）
- `--db`: DBを有効化する（未指定の場合は対話で「DBは使用しますか？」と聞かれる）
- `--core-class`: 制御クラス（Core）を有効化する（未指定の場合は対話で「制御クラス（Core）は使用しますか？」と聞かれる）
  - 名前まで指定したい場合は`--core-class=ClassName`とする。この場合クラス名の質問もスキップされる
  - `--core-class`のみ（値なし）で指定した場合、有効化の質問はスキップされるがクラス名は続けて対話で聞かれる（無記入なら`Core`になる）

```bash
# 対話フローに任せる
bunx create-disbord-app my-bot

# DBだけフラグで確定、Coreは対話に任せる
bunx create-disbord-app my-bot --db

# 両方フラグで確定し、Coreクラス名も指定
bunx create-disbord-app my-bot --db --core-class=GameCore
```

実行すると、生成先ディレクトリで`git init` → `bun install`まで自動的に行われます。既存ディレクトリと同名の場合はエラーになり、上書きはされません。

## 生成されるファイル構成

```
my-bot/
├── disbord.config.ts        # bot個別設定（db/coreClass有効時はここにブロックが追加される）
├── package.json              # scripts（dev/build/fmt/lint/env等）・依存一式
├── tsconfig.json              # @/* → src/* エイリアス（v7仕様。baseUrlは含まない）
├── .oxfmtrc.json / oxlint.config.ts  # oxfmt/oxlint設定（disbord/lintをextends）
├── mise.toml                  # bunのバージョン固定
├── lefthook.yml                # pre-commitでlint→fmt→env暗号化(--all)を実行
├── .gitignore
├── env/
│   ├── .env.development       # TOKEN= / CLIENT_ID= / GUILD_ID=（平文プレースホルダー）
│   └── .env.production        # TOKEN= / CLIENT_ID=（db有効時はTURSO_DATABASE_URL=/TURSO_AUTH_TOKEN=も追加）
├── src/
│   ├── events/ready.ts         # 唯一デフォルトで生成されるイベントハンドラ
│   ├── components/
│   │   └── slashCommands.ts    # buttonとselectMenuにも対応しているがoptional
│   ├── Core.ts                 # --core-class有効時のみ生成（制御クラス本体）
│   └── db/                     # --db有効時のみ生成（モデルは disbord generate model で追加）
└── .disbord/
    └── disbord.d.ts             # module augmentation用の生成物（git管理しない）
```

## 生成後の開発フロー

```bash
cd my-bot
bun run dev
```

`bun run dev`（`disbord dev`）が起動時にslashCommandのREST登録と（DB有効時は）migrationを自動で行うため、通常はこれだけで開発を始められます。以下は追加で必要になった場合のみ使います。

- `bun run commands` / `bun run commands:delete`: dev実行中にslashCommandを追加・変更した場合の再登録・削除（devの自動pushは起動時のみのため）
- `bun run gen:event <name>`: `src/events/`にイベントハンドラを追加生成
- `bun run gen:model <Name>`（DB有効時）: `src/db/models/`にモデルクラスを追加生成
- `bun run migrate` / `bun run studio`（DB有効時）: migrationの手動適用・drizzle studioの起動
- `bun run enable <db|core-class>` / `bun run disable <db|core-class>`: 後からDB・Coreを有効化・無効化
- `bun run env` / `bun run encrypt` / `bun run decrypt`: `env/`配下の暗号化状態の切り替え

本番運用は`bun run build`（`disbord build`）で生成した`dist/main.js`を`bun`で直接実行するだけで、`disbord start`のようなコマンドはありません。`dist`以下には`.env`が生成されるので`bun dist/main.js`ではなく`cd dist && bun main.js`のほうがいいと思います。
