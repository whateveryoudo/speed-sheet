export { ImageExtension, IMAGE_EXTENSION_NAME } from './extension'
export type { SheetImageExtensionStorage } from './extension'
export {
  computeCellImageBubbleAnchor,
  computeSheetImageAnchorRect,
  computeSheetImageDisplaySize,
  fitImageToCell,
  resolveSheetImageOriginSize,
  sheetImageStyleFromAnchor,
  SHEET_IMAGE_CELL_INSET,
} from './layout'
export type { SheetImageAnchorRect } from './layout'
export {
  removeSheetImagesInSelection,
  selectionHasSheetImages,
} from './selection'
