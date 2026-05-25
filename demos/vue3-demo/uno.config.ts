import { defineConfig, presetUno } from "unocss";

export default defineConfig({
  presets: [presetUno()],
  // 添加对CSS变量的支持
  rules: [
    [
      /^border-b-\[var\(--([^)]+)\)\]$/,
      ([, name]) => ({ "border-bottom": `1px solid var(--${name})` }),
    ],
  ],
});
