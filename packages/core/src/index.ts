/**
 * @speed-sheet/core
 * Core sheet editor logic without UI dependencies
 */

export interface Cell {
  r: number; // row
  c: number; // column
  v?: any; // value
  m?: string; // display value
  ct?: any; // cell type
  bg?: string; // background color
  bl?: number; // bold
  it?: number; // italic
  fs?: number; // font size
  fc?: string; // font color
}

export interface Sheet {
  name: string;
  index: string;
  order: number;
  celldata?: Cell[];
  config?: {
    merge?: any[];
    rowlen?: Record<number, number>;
    columnlen?: Record<number, number>;
  };
}

export interface Workbook {
  sheets: Sheet[];
  currentSheetIndex: number;
}

/**
 * Core Sheet Editor Class
 * Provides the core logic for sheet operations
 */
export class SheetEditor {
  private workbook: Workbook;

  constructor(workbook?: Workbook) {
    this.workbook = workbook || {
      sheets: [
        {
          name: 'Sheet1',
          index: '0',
          order: 0,
          celldata: [],
          config: {},
        },
      ],
      currentSheetIndex: 0,
    };
  }

  /**
   * Get current workbook
   */
  getWorkbook(): Workbook {
    return this.workbook;
  }

  /**
   * Get current sheet
   */
  getCurrentSheet(): Sheet {
    return this.workbook.sheets[this.workbook.currentSheetIndex];
  }

  /**
   * Set cell value
   */
  setCellValue(row: number, col: number, value: any): void {
    const sheet = this.getCurrentSheet();
    if (!sheet.celldata) {
      sheet.celldata = [];
    }

    const cellIndex = sheet.celldata.findIndex(
      (cell) => cell.r === row && cell.c === col
    );

    if (cellIndex >= 0) {
      sheet.celldata[cellIndex].v = value;
      sheet.celldata[cellIndex].m = String(value);
    } else {
      sheet.celldata.push({
        r: row,
        c: col,
        v: value,
        m: String(value),
      });
    }
  }

  /**
   * Get cell value
   */
  getCellValue(row: number, col: number): any {
    const sheet = this.getCurrentSheet();
    if (!sheet.celldata) {
      return null;
    }

    const cell = sheet.celldata.find((cell) => cell.r === row && cell.c === col);
    return cell?.v ?? null;
  }

  /**
   * Add a new sheet
   */
  addSheet(name?: string): Sheet {
    const newSheet: Sheet = {
      name: name || `Sheet${this.workbook.sheets.length + 1}`,
      index: String(this.workbook.sheets.length),
      order: this.workbook.sheets.length,
      celldata: [],
      config: {},
    };

    this.workbook.sheets.push(newSheet);
    return newSheet;
  }

  /**
   * Switch to a sheet by index
   */
  switchSheet(index: number): void {
    if (index >= 0 && index < this.workbook.sheets.length) {
      this.workbook.currentSheetIndex = index;
    }
  }
}

