import React from 'react';

type ClearProps = {
  onClear: () => void;
};

const Clear: React.FC<ClearProps> = ({ onClear }) => {
  return <button id = "clear" type = "button" onClick={onClear}>Clear</button>;
};

export default Clear;
