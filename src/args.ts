export type NewBotArgs = {
  name: string;
  /** true: --dbが指定された(質問をスキップして有効化)。undefined: 対話で聞く */
  db: true | undefined;
  /**
   * true: --core-classが値なしで指定された(質問はスキップして有効化するが、クラス名は対話で別途聞く)。
   * string: --core-class=Nameで指定された(質問・クラス名入力ともにスキップし、そのままクラス名になる)。
   * undefined: 対話で聞く(Yesと答えたら続けてクラス名も聞く)。
   */
  coreClass: string | true | undefined;
};

const CORE_CLASS_NAME_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/**
 * `create-disbord-app <name> [--db] [--core-class[=ClassName]]` の引数解析。
 * --db/--core-classは「指定したら質問をスキップしてYES確定」の前提フラグのみ対応する
 * (disbord.mdの記述通り。--no-dbのような明示的な否定フラグは今回のスコープ外)。
 * --core-class=ClassNameで生成するCoreクラスの名前まで指定できる(未指定時は対話で聞き、無記入なら`Core`)。
 */
export function parseNewBotArgs(args: (string | undefined)[]): NewBotArgs {
  let name: string | undefined;
  let db: true | undefined;
  let coreClass: string | true | undefined;

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
    if (arg.startsWith('--core-class=')) {
      const className = arg.slice('--core-class='.length);
      if (!CORE_CLASS_NAME_PATTERN.test(className)) {
        throw new Error(
          `disbord: --core-classの名前が不正です（"${className}"）。クラス名として使える文字列を指定してください`,
        );
      }
      coreClass = className;
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
    throw new Error('disbord: 使い方: create-disbord-app <name> [--db] [--core-class[=ClassName]]');
  }

  return { name, db, coreClass };
}
