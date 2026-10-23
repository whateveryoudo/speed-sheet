import { defineConfig } from "vite";
import { resolve } from "path";
import fs from "fs";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import UnoCSS from "@unocss/vite";
import Components from "unplugin-vue-components/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";
import { injectLibCss } from "../../build/inject-lib-css";

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
  : {};

export default defineConfig({
  plugins: [vue(), vueJsx(), UnoCSS(), injectLibCss(),
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
      cssFileName: "style",
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
      ...scAliases,
      "@speed-sheet/vue3/style.css": resolve(__dirname, "../vue3/dist/style.css"),
    },

  },
});

