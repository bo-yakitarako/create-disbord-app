export type NewBotArgs = {
  name: string;
  /** true: --dbが指定された(質問をスキップして有効化)。undefined: 対話で聞く */
  db: true | undefined;
  /** true: --core-classが指定された(質問をスキップして有効化)。undefined: 対話で聞く */
  coreClass: true | undefined;
};

/**
 * `create-disbord-app <name> [--db] [--core-class]` の引数解析。
 * --db/--core-classは「指定したら質問をスキップしてYES確定」の前提フラグのみ対応する
 * (disbord.mdの記述通り。--no-dbのような明示的な否定フラグは今回のスコープ外)。
 */
export function parseNewBotArgs(args: (string | undefined)[]): NewBotArgs {
  let name: string | undefined;
  let db: true | undefined;
  let coreClass: true | undefined;

  for (const arg of args) {
    if (arg === undefined) continue;
    if (arg === '--db') {
      db = true;
      continue;
    }
    if (arg === '--core-class') {
      coreClass = true;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`disbord: 不明な引数 "${arg}"`);
    }
    if (name !== undefined) {
      throw new Error(`disbord: bot名は1つだけ指定してください（既に"${name}"を指定済み、追加で"${arg}"）`);
    }
    name = arg;
  }

  if (name === undefined) {
    throw new Error('disbord: 使い方: create-disbord-app <name> [--db] [--core-class]');
  }

  return { name, db, coreClass };
}
