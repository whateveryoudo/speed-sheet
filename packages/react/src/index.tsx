/**
 * @speed-sheet/react
 * React renderer for speed-sheet
 */

import React, { useMemo, useState, useCallback } from 'react';
import { SheetEditor, Workbook } from '@speed-sheet/core';

export interface SpeedSheetProps {
  workbook?: Workbook;
  onChange?: (workbook: Workbook) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * SpeedSheet React Component
 */
export const SpeedSheet: React.FC<SpeedSheetProps> = ({
  workbook,
  onChange,
  className,
  style,
}) => {
  const editor = useMemo(() => {
    return new SheetEditor(workbook);
  }, [workbook]);

  const [localWorkbook, setLocalWorkbook] = useState<Workbook>(
    workbook || editor.getWorkbook()
  );

  const handleCellChange = useCallback(
    (row: number, col: number, value: any) => {
      editor.setCellValue(row, col, value);
      const updated = editor.getWorkbook();
      setLocalWorkbook(updated);
      onChange?.(updated);
    },
    [editor, onChange]
  );

  const currentSheet = editor.getCurrentSheet();

  return (
    <div className={className} style={style}>
      <div className="speed-sheet-container">
        <div className="speed-sheet-toolbar">
          <span>Sheet: {currentSheet.name}</span>
        </div>
        <div className="speed-sheet-grid">
          {/* TODO: Implement grid rendering */}
          <div>Grid will be rendered here</div>
        </div>
      </div>
    </div>
  );
};

export default SpeedSheet;

