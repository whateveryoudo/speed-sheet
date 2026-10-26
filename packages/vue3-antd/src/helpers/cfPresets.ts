import type { CfCellConditionOp, CfCellStyle } from '@speed-sheet/extension-conditional-format'

import gBlue from '../assets/databar/gradient-blue.png'
import gGreen from '../assets/databar/gradient-green.png'
import gRed from '../assets/databar/gradient-red.png'
import gYellow from '../assets/databar/gradient-yellow.png'
import gPurple from '../assets/databar/gradient-purple.png'
import gCyan from '../assets/databar/gradient-cyan.png'

import sBlue from '../assets/databar/solid-blue.png'
import sGreen from '../assets/databar/solid-green.png'
import sRed from '../assets/databar/solid-red.png'
import sYellow from '../assets/databar/solid-yellow.png'
import sPurple from '../assets/databar/solid-purple.png'
import sCyan from '../assets/databar/solid-cyan.png'

export const DEFAULT_CF_CELL_STYLE: CfCellStyle = {
  bg: '#ffc7ce',
  fc: '#9c0006',
}

export const CF_CELL_OP_OPTIONS: { key: CfCellConditionOp; labelKey: string }[] = [
  { key: 'greaterThan', labelKey: 'conditionalFormat.op.greaterThan' },
  { key: 'lessThan', labelKey: 'conditionalFormat.op.lessThan' },
  { key: 'between', labelKey: 'conditionalFormat.op.between' },
  { key: 'equal', labelKey: 'conditionalFormat.op.equal' },
  { key: 'textContains', labelKey: 'conditionalFormat.op.textContains' },
]

export type CfDataBarPreset = {
  id: string
  color: string
  gradient: boolean
  labelKey: string
  img?: string
}

export const CF_DATA_BAR_GRADIENT_PRESETS: CfDataBarPreset[] = [
  { id: 'g-blue', color: '#5b9bd5', gradient: true, labelKey: 'conditionalFormat.color.blue', img: gBlue },
  { id: 'g-green', color: '#63c384', gradient: true, labelKey: 'conditionalFormat.color.green', img: gGreen },
  { id: 'g-red', color: '#f8696b', gradient: true, labelKey: 'conditionalFormat.color.red', img: gRed },
  { id: 'g-yellow', color: '#ffd966', gradient: true, labelKey: 'conditionalFormat.color.yellow', img: gYellow },
  { id: 'g-purple', color: '#b2a1c7', gradient: true, labelKey: 'conditionalFormat.color.purple', img: gPurple },
  { id: 'g-cyan', color: '#4bacc6', gradient: true, labelKey: 'conditionalFormat.color.cyan', img: gCyan },
]

export const CF_DATA_BAR_SOLID_PRESETS: CfDataBarPreset[] = [
  { id: 's-blue', color: '#5b9bd5', gradient: false, labelKey: 'conditionalFormat.color.blue', img: sBlue },
  { id: 's-green', color: '#63c384', gradient: false, labelKey: 'conditionalFormat.color.green', img: sGreen },
  { id: 's-red', color: '#f8696b', gradient: false, labelKey: 'conditionalFormat.color.red', img: sRed },
  { id: 's-yellow', color: '#ffd966', gradient: false, labelKey: 'conditionalFormat.color.yellow', img: sYellow },
  { id: 's-purple', color: '#b2a1c7', gradient: false, labelKey: 'conditionalFormat.color.purple', img: sPurple },
  { id: 's-cyan', color: '#4bacc6', gradient: false, labelKey: 'conditionalFormat.color.cyan', img: sCyan },
]
