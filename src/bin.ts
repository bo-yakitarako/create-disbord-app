#!/usr/bin/env bun
import { runNewBot } from './newBot';

/**
 * CLIツールなのでraw stack traceは出さず、エラーメッセージだけ出してexitする
 * (parseNewBotArgsの引数エラーだけでなく、runNewBot側の実行時エラー(既存ディレクトリ等)も同様に扱う)。
 */
async function main() {
  try {
    await runNewBot(Bun.argv.slice(2), process.cwd());
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

void main();
