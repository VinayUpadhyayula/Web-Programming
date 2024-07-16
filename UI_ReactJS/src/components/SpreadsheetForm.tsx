import React, { useState } from 'react';
import '../../src/style.css';
import { WS_URL } from 'src/App';
type SpreadsheetFormProps = {
  onLoad: (spreadsheetName: string, spreadsheetUrl: string) => void;
};

const SpreadsheetForm: React.FC<SpreadsheetFormProps> = ({ onLoad }) => {
  const [spreadsheetName, setSpreadsheetName] = useState('');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(WS_URL);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoad(spreadsheetName, spreadsheetUrl);
  };

  return (
    <form className="form" id="ss-form" onSubmit={handleSubmit}>
      <label htmlFor="ws-url">Web Services Url</label>
      <input
        name="ws-url"
        type="text"
        id="ws-url"
        value={spreadsheetUrl}
        onChange={(e) => setSpreadsheetUrl(e.target.value)}
      />
      <label htmlFor="ss-name">Spreadsheet Name</label>
      <input
        name="ss-name"
        type="text"
        id="ss-name"
        value={spreadsheetName}
        onChange={(e) => setSpreadsheetName(e.target.value)}
      />
      <label></label>
      <button type="submit">Load Spreadsheet</button>
    </form>
  );
};

export default SpreadsheetForm;
