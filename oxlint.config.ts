import { config } from 'disbord/lint';

// create-disbord-app自身もdisbordと同じく@/エイリアスを持たず相対importで書かれているため、
// disbord/lintが標準で持つno-restricted-imports(相対import禁止)だけ無効化する。
export default {
  extends: [config],
  rules: {
    'no-restricted-imports': 'off',
  },
};
