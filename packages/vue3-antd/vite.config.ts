import { defineConfig } from "vite";
import { resolve } from "path";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import UnoCSS from "@unocss/vite";
import Components from "unplugin-vue-components/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";

export default defineConfig({
  plugins: [vue(), vueJsx(), UnoCSS(),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: false, // 不使用自动导入样式
          resolveIcons: true, // 自动解析图标
        }),
      ],
      dts: "src/components.d.ts", // 生成类型声明文件
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "SpeedSheetVue3Antd",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
    },
    rollupOptions: {
      external: [
        "vue",
        "@floating-ui/dom",
        "@speed-sheet/core",
        "@speed-sheet/extension-formula",
        "@speed-sheet/shared",
        "@speed-sheet/vue3",
        "ant-design-vue",
        "@ant-design/icons-vue",
        "vuedraggable",
        "sortablejs",
      ],
      output: {
        globals: { vue: "Vue" },
      },
    },
  },
  optimizeDeps: {
    exclude: ["speed-components-ui"],
  },
  resolve: {
    dedupe: ["vue"],
    alias: {
      "@sc": resolve(__dirname, "../../../speed-components/src"),
      "@speed-sheet/core": resolve(__dirname, "../core/src/index.ts"),
      "@speed-sheet/extension-formula": resolve(
        __dirname,
        "../extensions/extension-formula/src/index.ts",
      ),
      "@speed-sheet/shared": resolve(__dirname, "../shared/src/index.ts"),
      "@speed-sheet/vue3": resolve(__dirname, "../vue3/src/index.ts"),
    },
  },
});
