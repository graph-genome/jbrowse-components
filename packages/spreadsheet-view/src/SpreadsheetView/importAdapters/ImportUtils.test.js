import PluginManager from '@gmod/jbrowse-core/PluginManager'
import { TextDecoder, TextEncoder } from 'fastestsmallesttextencoderdecoder'
import { promises as fsPromises } from 'fs'
import { parseCsvBuffer } from './ImportUtils'

window.TextEncoder = TextEncoder
window.TextDecoder = TextDecoder

const pluginManager = new PluginManager()
const SpreadsheetModel = pluginManager.jbrequire(
  require('../models/Spreadsheet'),
)

test('csv to spreadsheet snapshot', async () => {
  const filepath = `${process.cwd()}/packages/spreadsheet-view/src/SpreadsheetView/test_data/breast_cancer.subset.csv`
  const buf = await fsPromises.readFile(filepath)
  const spreadsheetSnap = await parseCsvBuffer(buf, {
    hasColumnNameLine: true,
    columnNameLineNumber: 1,
  })
  expect(spreadsheetSnap).toMatchSnapshot()
  const spreadsheet = SpreadsheetModel.create(spreadsheetSnap)
  expect(spreadsheet.rowSet.rows.length).toBe(49)
})
