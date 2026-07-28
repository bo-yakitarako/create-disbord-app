import { describe, expect, test } from 'bun:test';
import { parseNewBotArgs } from '../src/args';

describe('parseNewBotArgs', () => {
  test('nameのみ指定時はdb/coreClassともにundefined(対話フローで聞く)', () => {
    expect(parseNewBotArgs(['my-bot'])).toEqual({ name: 'my-bot', db: undefined, coreClass: undefined });
  });

  test('--dbで質問をスキップしてtrue確定', () => {
    expect(parseNewBotArgs(['my-bot', '--db'])).toEqual({ name: 'my-bot', db: true, coreClass: undefined });
  });

  test('--core-classで質問をスキップしてtrue確定', () => {
    expect(parseNewBotArgs(['my-bot', '--core-class'])).toEqual({
      name: 'my-bot',
      db: undefined,
      coreClass: true,
    });
  });

  test('--db --core-class両方指定できる(順不同)', () => {
    expect(parseNewBotArgs(['--core-class', 'my-bot', '--db'])).toEqual({
      name: 'my-bot',
      db: true,
      coreClass: true,
    });
  });

  test('name省略時はthrow', () => {
    expect(() => parseNewBotArgs(['--db'])).toThrow();
    expect(() => parseNewBotArgs([])).toThrow();
    expect(() => parseNewBotArgs([undefined])).toThrow();
  });

  test('nameを2つ指定するとthrow', () => {
    expect(() => parseNewBotArgs(['my-bot', 'other-bot'])).toThrow();
  });

  test('不明な--フラグはthrow', () => {
    expect(() => parseNewBotArgs(['my-bot', '--foo'])).toThrow();
  });
});
