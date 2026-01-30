/**
 * @speed-sheet/vue3
 * Vue3 renderer for speed-sheet
 */

import { defineComponent, ref, computed, watch, type PropType } from 'vue';
import { SheetEditor, Workbook } from '@speed-sheet/core';

export interface SpeedSheetProps {
  workbook?: Workbook;
  onChange?: (workbook: Workbook) => void;
  class?: string;
  style?: string | Record<string, any>;
}

/**
 * SpeedSheet Vue3 Component
 */
export const SpeedSheet = defineComponent({
  name: 'SpeedSheet',
  props: {
    workbook: {
      type: Object as PropType<Workbook>,
      default: undefined,
    },
    onChange: {
      type: Function as PropType<(workbook: Workbook) => void>,
      default: undefined,
    },
    class: {
      type: String,
      default: '',
    },
    style: {
      type: [String, Object] as PropType<string | Record<string, any>>,
      default: undefined,
    },
  },
  setup(props) {
    const editor = ref<SheetEditor>(
      new SheetEditor(props.workbook)
    );

    const localWorkbook = ref<Workbook>(
      props.workbook || editor.value.getWorkbook()
    );

    // Watch for external workbook changes
    watch(
      () => props.workbook,
      (newWorkbook) => {
        if (newWorkbook) {
          editor.value = new SheetEditor(newWorkbook);
          localWorkbook.value = editor.value.getWorkbook();
        }
      },
      { deep: true }
    );

    const currentSheet = computed(() => {
      return editor.value.getCurrentSheet();
    });

    const handleCellChange = (row: number, col: number, value: any) => {
      editor.value.setCellValue(row, col, value);
      const updated = editor.value.getWorkbook();
      localWorkbook.value = updated;
      props.onChange?.(updated);
    };

    return {
      currentSheet,
      handleCellChange,
    };
  },
  render() {
    return (
      <div class={this.$props.class} style={this.$props.style}>
        <div class="speed-sheet-container">
          <div class="speed-sheet-toolbar">
            <span>Sheet: {this.currentSheet.name}</span>
          </div>
          <div class="speed-sheet-grid">
            {/* TODO: Implement grid rendering */}
            <div>Grid will be rendered here</div>
          </div>
        </div>
      </div>
    );
  },
});

export default SpeedSheet;

