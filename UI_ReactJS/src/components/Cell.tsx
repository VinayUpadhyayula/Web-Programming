import React, { useState, useEffect, useRef } from 'react';
type CellProps = {
  cellId: string;
  value: string;
  expr: string;
  isFocused: boolean;
  isCopied: boolean;
  onFocusChange: (cellId: string, isFocused: boolean) => void;
  onContentChange: (cellId: string, content: string) => void;
  onBlurChange: (cellId: string, content: string) => void;
  onCopy:()=>void;
  onPaste:()=>void;
};

const Cell: React.FC<CellProps> = ({
  cellId,
  value,
  expr,
  isFocused,
  isCopied,
  onFocusChange,
  onContentChange,
  onBlurChange,
  onCopy,
  onPaste
}) => {
  const [content, setContent] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isFocused) {
      if(inputRef.current){
        setContent(inputRef.current.value)
        inputRef.current.focus();
      }
      setContent(expr);
    }
    else
       setContent(value);
  }, [isFocused,value,expr]);

  const handleContentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newContent = event.target.value; 
    setContent(newContent);
    onContentChange(cellId, newContent);
  };

  const handleFocusChange = (newFocus: boolean) => {
    setContent(expr);
    onFocusChange(cellId, newFocus);
    //setContent((oldData)=>value);
  };
  const handleBlurChange = (newValue:string)=>{
    onBlurChange(cellId,newValue);
  }

  return (
    <td className={`cell-data ${isCopied ? 'is-copy-source': ''}`}>
      <input
        id = {cellId}
        ref={inputRef}
        type="text"
        value={content}
        onChange={handleContentChange}
        onFocus={() => handleFocusChange(true)}
        onBlur={()=> handleBlurChange(content)}
        data-is-focused={isFocused}
        onCopy = {onCopy}
        onPaste = {onPaste}
      />
    </td>
  );
};

export default Cell;
