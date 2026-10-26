import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import UnoCSS from "@unocss/vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { resolve } from "path";
import fs from "fs";
import Components from "unplugin-vue-components/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";
import { createSimpleSvgSpritePlugin } from "../../build/simple-svg-sprite";

const localScSrc = resolve(__dirname, "../../../speed-components/src");
const localScCss = resolve(__dirname, "../../../speed-components/dist/style.css");
const useLocalSc = fs.existsSync(localScSrc) && fs.existsSync(localScCss) && !process.env.CI;

const scAliases = useLocalSc
  ? {
      "@sc": localScSrc,
      "speed-components-ui/dist/style.css": localScCss,
      "speed-components-ui/components": resolve(__dirname, "../../../speed-components/src/components"),
      "speed-components-ui/hooks": resolve(__dirname, "../../../speed-components/src/hooks"),
      "speed-components-ui": localScSrc,
    }
  : {
      "@sc": localScSrc,
    };

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/speed-sheet/demo/" : "/",
  plugins: [
    vue(),
    vueJsx(),
    UnoCSS(),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: false, // 不使用自动导入样式
          resolveIcons: true, // 自动解析图标
        }),
      ],
    }),
    createSimpleSvgSpritePlugin({
      iconDirs: [resolve(__dirname, "../../packages/vue3-antd/src/icons")],
      symbolId: (name: string) => `icon-${name}`,
    }),
  ],
  // Dev: always use package source (avoid stale dist with old canvas layout)
  resolve: {
    dedupe: ["vue"],
    alias: {
      ...scAliases,
      // 须在 @speed-sheet/vue3 之前，避免 index.ts/style.css 解析失败
      "@speed-sheet/vue3/style.css": resolve(
        __dirname,
        "../../packages/vue3/dist/style.css",
      ),
      "@speed-sheet/vue3-antd": resolve(
        __dirname,
        "../../packages/vue3-antd/src/index.ts",
      ),
      "@speed-sheet/shared": resolve(
        __dirname,
        "../../packages/shared/src/index.ts",
      ),
      "@speed-sheet/vue3": resolve(
        __dirname,
        "../../packages/vue3/src/index.ts",
      ),
      "@speed-sheet/core": resolve(
        __dirname,
        "../../packages/core/src/index.ts",
      ),
      "@speed-sheet/extension-formula": resolve(
        __dirname,
        "../../packages/extensions/extension-formula/src/index.ts",
      ),
      "@speed-sheet/extension-import-export": resolve(
        __dirname,
        "../../packages/extensions/extension-import-export/src/index.ts",
      ),
    },
  },
  optimizeDeps: {
    include: ["yjs", "lib0"],
    exclude: useLocalSc ? ["speed-components-ui"] : [],
  },
  server: {
    port: 4000,
  },
}));
