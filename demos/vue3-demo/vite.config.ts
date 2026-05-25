import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import UnoCSS from "@unocss/vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { resolve } from "path";
import Components from "unplugin-vue-components/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";

export default defineConfig({
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
  ],
  // Dev: always use package source (avoid stale dist with old canvas layout)
  resolve: {
    alias: {
      "@sc": resolve(__dirname, "../../../speed-components/src"),
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
    },
  },
  optimizeDeps: {
    include: ["yjs", "lib0"],
  },
  server: {
    port: 4000,
  },
});
