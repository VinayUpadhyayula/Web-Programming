import React, { useState } from 'react';
import SpreadsheetForm from './components/SpreadsheetForm';
import Spreadsheet from './components/Spreadsheet';
import SpreadsheetWs from './ss-ws';
export const WS_URL = 'https://zdu.binghamton.edu:2345';

type CellData = {
  expr: string;
  value: string;
};

type SpreadsheetData = {
  [cellId: string]: CellData;
};

const initialSpreadsheetData: SpreadsheetData = {};
for (let row = 1; row <= 10; row++) {
  for (let col = 1; col <= 10; col++) {
    const cellId = String.fromCharCode(96 + col) + row;
    initialSpreadsheetData[cellId] = { expr: '', value: '' };
  }
}
const App: React.FC = () => {
  let ws: SpreadsheetWs;
  ws = SpreadsheetWs.make(WS_URL);
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetData>(initialSpreadsheetData);
  const [showTable, setShowTable] = useState(false);
  const [spreadsheetName, setSpreadsheetName] = useState('');
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [errors, setErrors] = useState<string | null>(null);

  const handleClearSpreadsheet = async () => {
    const result = await ws.clear(spreadsheetName);
    if (result.isOk) {
      setSpreadsheetData((prevData) => {
        const data = { ...prevData };
        for (const d in data) {
          data[d] = {
            expr: '',
            value: ''
          }
        }
        return data;
      });
    }
  };

  const handleCellContentChange = (cellId: string, content: string) => {
    // setSpreadsheetData((prevData) => {
    //  const d = {...prevData};
    //    if(cellId === focusedCell)
    //     d[cellId].expr = content;
    //   // else 
    //   //   d[cellId].value = content;
    //     return d;
    //   })
  };
  const handleBlur = async (cellId: string, value: string) => {
    try {
      let result;

      if (value.trim() !== '')
        result = await ws.evaluate(spreadsheetName, cellId, value);
      else {
        spreadsheetData[cellId].value = '';
        result = await ws.remove(spreadsheetName, cellId);
      }
      if (result.isOk) {
        const res = result.val;
        setSpreadsheetData((prevData) => {
          const d = { ...prevData };
          d[cellId].expr = value;
          for (const key in res) {
            d[key].value = res[key].toString();
          }
          return d;
        })
      }
      else if (!result.isOk && result.errors) {
        setErrors(result.errors[0].message);
      }
    } catch (e) {
      setErrors(e);
    }
  };

  const handleLoadSpreadsheet = async (spreadsheetName: string, spreadsheetUrl: string) => {
    try {
      setErrors(null);
      ws = SpreadsheetWs.make(spreadsheetUrl);
      setSpreadsheetName(spreadsheetName);
      const fetchData = await ws.dumpWithValues(spreadsheetName);
      if (fetchData.isOk) {
        setSpreadsheetData((prevData) => {
          const updatedSpreadsheetData = { ...prevData };
          for (const [cellId, expr, value] of fetchData.val) {
            updatedSpreadsheetData[cellId] = {
              expr: expr,
              value: value.toString(),
            };
          }
          return updatedSpreadsheetData;
        });
      }
      else if (!fetchData.isOk && fetchData.errors) {
        setErrors(fetchData.errors[0].message);
      }
      setShowTable(true);
    } catch (e) {
      setErrors(e);
    }
  };
  const handleFocusedCellChange = (cellId: string) => {
    setErrors(null);
    setFocusedCell(cellId);
    // setSpreadsheetData((prevData)=>{
    //   const d = {...prevData}
    //   d[cellId].value = d[cellId].expr;
    //   return d;
    // })
  };

  const handleCopy = (cellId: string) => {
    setCopiedCell(cellId); // Update the copiedCell state
  };
  const handlePaste = async (cellId: string, event: React.ClipboardEvent<HTMLInputElement>) => {
    try {
      if (event)
        event.preventDefault();
      if (copiedCell) {
        const res = await ws.copy(spreadsheetName, cellId, copiedCell);
        if (res.isOk) {
          const res1 = await ws.query(spreadsheetName, cellId);
          if (res1.isOk) {
            setSpreadsheetData((prevData) => {
              const d = { ...prevData };
              d[cellId].expr = res1.val.expr;
              d[cellId].value = res1.val.value.toString();
              return d;
            })
          }
        }
      }
    } catch (e) {
      setErrors(e.message)
    }
  };


  return (
    <><SpreadsheetForm onLoad={handleLoadSpreadsheet} />
      {errors && <ul className='error' id='error'>
        <li>{errors}</li>
      </ul>}
      <div id="ss">
        {showTable && <Spreadsheet
          spreadsheetData={spreadsheetData}
          onCellContentChange={handleCellContentChange}
          onClear={handleClearSpreadsheet}
          spreadsheetName={spreadsheetName}
          onBlur={handleBlur}
          onFocusedCellChange={handleFocusedCellChange}
          onCopy={handleCopy}
          onPaste={handlePaste}
        />}
      </div>
    </>
  );
};
export default App;
