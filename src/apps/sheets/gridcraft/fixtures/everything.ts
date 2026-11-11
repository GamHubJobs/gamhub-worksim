/**
 * A workbook with everything WorkSim's format can hold, for the Grid Craft
 * round trip: `everything.gridcraft.json` is this workbook built in the real
 * Grid Craft (its `workbookCommands`) and saved as its JSON. To make it again
 * after updating Grid Craft: `npm run crafts:fixture`.
 */
import type { SheetContent } from '../../../../persistence/schemas'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

export const EVERYTHING: SheetContent = {
  sheets: [
    {
      id: id(1),
      name: 'Budget',
      cells: {
        A1: { input: 'Item', format: { bold: true, fill: 'gray' } },
        B1: { input: 'Cost', format: { bold: true, fill: 'gray', align: 'right' } },
        C1: { input: 'Share', format: { bold: true, fill: 'gray', align: 'center' } },
        D1: { input: 'Note', format: { italic: true, underline: true } },
        A2: { input: 'Rent' },
        B2: { input: '1200.50', format: { numberFormat: 'currency' } },
        C2: { input: '=B2/B$5', format: { numberFormat: 'percent' } },
        D2: { input: 'Due on the 1st', format: { textColor: 'red' } },
        A3: { input: 'Power' },
        B3: { input: '150', format: { numberFormat: 'currency', decimals: 0 } },
        C3: { input: '=B3/B$5', format: { numberFormat: 'percent', decimals: 1 } },
        D3: { input: "'00123", format: { textColor: 'green' } },
        A4: { input: 'Water' },
        B4: { input: '45.25', format: { numberFormat: 'number' } },
        C4: {
          input: '=ROUND(B4 / B$5, 3)',
          format: { numberFormat: 'number', decimals: 3 },
        },
        D4: { input: 'TRUE', format: { textColor: 'blue', fill: 'yellow' } },
        A5: { input: 'Total', format: { bold: true } },
        B5: { input: '=SUM(B2:B4)', format: { bold: true, numberFormat: 'currency' } },
        D5: { input: '2026-03-01', format: { textColor: 'amber', fill: 'green' } },
        D6: { input: 'grey', format: { textColor: 'gray', fill: 'blue' } },
        D7: { input: 'red fill', format: { fill: 'red' } },
        F10: { input: '=IF(B5>1000, "High", "Low")', format: { align: 'left' } },
      },
      columnWidths: { A: 140, D: 180 },
      charts: [
        { id: id(11), type: 'column', title: 'Costs', range: 'A1:B4' },
        { id: id(12), type: 'pie', title: 'Shares', range: 'A2:A4' },
      ],
    },
    {
      id: id(2),
      name: 'Q1 Notes & more',
      cells: {
        A1: { input: 'Category' },
        A2: { input: 'Travel' },
        B1: { input: 'Score' },
        B2: { input: '7' },
        C2: { input: "='Q1 Notes & more'!B2*2" },
        D2: { input: '=Budget!B5' },
      },
      validations: [
        {
          id: id(21),
          range: 'A2:A9',
          rule: { type: 'list', items: ['Travel', 'Office, misc', 'Say "hi"'] },
        },
        {
          id: id(22),
          range: 'B2:B9',
          rule: { type: 'number', min: 0, max: 10, wholeNumber: true },
        },
      ],
      conditionalFormats: [
        {
          id: id(31),
          range: 'B2:B9',
          rule: { op: 'gt', value: '5' },
          style: { fill: 'green', bold: true },
        },
        {
          id: id(32),
          range: 'A2:A9',
          rule: { op: 'contains', value: 'Tra' },
          style: { textColor: 'blue' },
        },
        {
          id: id(33),
          range: 'B2:B9',
          rule: { op: 'between', value: '1', value2: '3' },
          style: { fill: 'red' },
        },
      ],
    },
  ],
}
