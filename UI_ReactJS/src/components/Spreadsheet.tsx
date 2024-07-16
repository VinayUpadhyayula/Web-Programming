import React, { useState } from 'react';
import Cell from './Cell';
import Clear from './Clear';
import { WS_URL } from 'src/App';
import SpreadsheetWs from 'src/ss-ws';

type CellData = {
  expr: string;
  value: string;
};

type SpreadsheetData = {
  [cellId: string]: CellData;
};

type SpreadsheetProps = {
  spreadsheetData: SpreadsheetData;
  spreadsheetName: string;
  onCellContentChange: (cellId: string, content: string) => void;
  onClear: () => void;
  onBlur: (cellId: string, value: string) => void;
  onFocusedCellChange: (cellId: string | null) => void;
  onCopy: (cellId: string) => void;
  onPaste: (cellId: string, event?: React.ClipboardEvent<HTMLInputElement>) => void;
};

const Spreadsheet: React.FC<SpreadsheetProps> = ({ spreadsheetData, spreadsheetName, onCellContentChange, onClear, onBlur, onFocusedCellChange, onCopy, onPaste }) => {
  const ws = SpreadsheetWs.make(WS_URL);
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const handleCellFocusChange = (cellId: string, isFocused: boolean) => {
    setFocusedCell(cellId);
    // const d = {...spreadsheetData};
    // d[cellId].value = d[cellId].expr;
    onFocusedCellChange(cellId);
    //return d;
  };
  const handleBlurHandler = async (cellId: string, value: string) => {
    if (focusedCell)
      onBlur(cellId, value);
  };
  const handleClear = () => {
    onClear();
  }
  return (
    <table>
      <tbody>
        <tr>
          <td>
            <Clear onClear={handleClear} />
          </td>
          {Array.from({ length: 10 }, (_, colIndex) => (
            <th key={colIndex}>{String.fromCharCode(65 + colIndex)}</th>
          ))}
        </tr>
        {Array.from({ length: 10 }, (_, rowIndex) => (
          <tr key={rowIndex}>
            <th>{rowIndex + 1}</th>
            {Array.from({ length: 10 }, (_, colIndex) => {
              const cellId = String.fromCharCode(97 + colIndex) + (rowIndex + 1);
              const cellData = spreadsheetData[cellId];
              return (
                <Cell
                  key={cellId}
                  cellId={cellId}
                  expr={cellData.expr}
                  value={cellData.value}
                  onContentChange={onCellContentChange}
                  onFocusChange={handleCellFocusChange}
                  onBlurChange={handleBlurHandler}
                  isFocused={cellId === focusedCell}
                  isCopied={cellId === copiedCell}
                  onCopy={() => {
                    onCopy(cellId);
                    setCopiedCell(cellId);
                  }}
                  onPaste={() => {
                    onPaste(cellId);
                    setCopiedCell(null);
                  }}
                />
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Spreadsheet;
