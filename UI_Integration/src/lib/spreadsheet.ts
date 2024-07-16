import SpreadsheetWs from './ss-ws.js';

import { Result, okResult, errResult, OkResult, ErrResult } from 'cs544-js-utils';

import { Errors, makeElement } from './utils.js';

const [N_ROWS, N_COLS] = [10, 10];

export default async function make(ws: SpreadsheetWs, ssName: string) {
  return await Spreadsheet.make(ws, ssName);
}


class Spreadsheet {

  private readonly ws: SpreadsheetWs;
  private readonly ssName: string;
  private readonly errors: Errors;
  private currentFocusCell: HTMLElement;
  private currentCopyCell: HTMLElement | null;

  constructor(ws: SpreadsheetWs, ssName: string) {
    this.ws = ws; this.ssName = ssName;
    this.errors = new Errors();
    this.makeEmptySS();
    this.addListeners();
  }

  static async make(ws: SpreadsheetWs, ssName: string) {
    const ss = new Spreadsheet(ws, ssName);
    await ss.load();
    return ss;
  }

  /** add listeners for different events on table elements */
  private addListeners() {
    document.querySelector('#clear')?.addEventListener('click', this.clearSpreadsheet);
    document.querySelectorAll('.cell').forEach((cell) => {
      cell.addEventListener('focusin', this.focusCell)
      cell.addEventListener('focusout', this.blurCell)
      cell.addEventListener('copy', this.copyCell)
      cell.addEventListener('paste', this.pasteCell)
    });
  }

  /** listener for a click event on #clear button */
  private readonly clearSpreadsheet = async (ev: Event) => {
    const result = await this.ws.clear(this.ssName);
    if (result.isOk) {
      const cells = document.querySelectorAll('.cell');
      cells.forEach((cell: HTMLElement) => {
        cell.dataset.expr = ""
        cell.dataset.value = ""
        cell.textContent = ""
      })
    }
    else if (result.errors)
      this.errors.display(result.errors);
  };

  /** listener for a focus event on a spreadsheet data cell */
  private readonly focusCell = (ev: Event) => {
    const focuscell = document.activeElement as HTMLElement;
    if (focuscell instanceof HTMLElement) {
      this.currentFocusCell = focuscell;
      focuscell.textContent = focuscell.dataset.expr || "";
    }

  };

  /** listener for a blur event on a spreadsheet data cell */
  private readonly blurCell = async (ev: Event) => {
    try {
      this.errors.clear();
      const focuscell = ev.target as HTMLElement;
      let blurResult;
      if (focuscell) {
        const cellContent = focuscell.textContent;
        if (cellContent !== null) {
          if (cellContent.trim() === '')
            blurResult = await this.ws.remove(this.ssName, focuscell.id)
          else
            blurResult = await this.ws.evaluate(this.ssName, focuscell.id, cellContent.trim())
        }
        this.cascadeUpdates(blurResult, focuscell);
      }
    }
    catch (err) {
      this.errors.display(err);
    }
  };

  /** listener for a copy event on a spreadsheet data cell */
  private readonly copyCell = (ev: Event) => {
    this.currentCopyCell = ev.target as HTMLElement;
    if (this.currentCopyCell) {
      const cell = document.getElementById(this.currentCopyCell.id);
      const classList = cell?.classList;
      classList?.add('is-copy-source');
    }
  };

  /** listener for a paste event on a spreadsheet data cell */
  private readonly pasteCell = async (ev: Event) => {
    try {
      ev.preventDefault();
      const pasteCell = ev.target as HTMLElement;
      if (pasteCell && this.currentCopyCell) {
        const res = await this.ws.copy(this.ssName, pasteCell.id, this.currentCopyCell.id);
        if (res.isOk) {
          const res1 = await this.ws.query(this.ssName, pasteCell.id);
          if (res1.isOk) {
            const cell = document.getElementById(pasteCell.id)
            if (cell) {
              cell.dataset.expr = res1.val.expr || "";
              cell.textContent = res1.val.expr || "";
            }
            this.removeSourceClassAttribute(this.currentCopyCell.id);
            this.currentCopyCell = null;
          }
        }
        else {
          this.removeSourceClassAttribute(this.currentCopyCell.id);
          this.errors.display(res.errors);
        }
      }
    }
    catch (err) {
      this.errors.display(err);
    }
  };

  private removeSourceClassAttribute(copyCellid: string) {
    const c1 = document.getElementById(copyCellid);
    const classList = c1?.classList;
    classList?.remove('is-copy-source');
  }

  private cascadeUpdates(result: any, blurCell: HTMLElement) {
    if (result.isOk) {
      blurCell.dataset.expr = blurCell.textContent || ""
      for (const key in result.val) {
        if (key !== this.currentFocusCell.id) {
          const cell = document.getElementById(key)
          if (cell) {
            cell.dataset.value = result.val[key].toString();
            cell.textContent = result.val[key].toString();
          }
        }
      }
    }
    else {
      blurCell.textContent = blurCell.dataset.value || null;
      throw result.errors;
    }
  }

  /** Replace entire spreadsheet with that from the web services.
   *  Specifically, for each active cell set its data-value and 
   *  data-expr attributes to the corresponding values returned
   *  by the web service and set its text content to the cell value.
   */
  /** load initial spreadsheet data into DOM */
  private async load() {
    try {
      const res = await this.ws.dumpWithValues(this.ssName);
      if (res.isOk) {
        for (let i = 0; i < res.val.length; i++) {
          const cell = document.getElementById(res.val[i][0]);
          if (cell) {
            cell.dataset.expr = res.val[i][1];
            cell.dataset.value = res.val[i][2].toString();
            cell.textContent = res.val[i][2].toString()
          }
        }
      }
      else if (!res.isOk && res.errors) {
        this.errors.display(res.errors)
      }
    }
    catch (err) {
      this.errors.display(err)
    }
  }


  private makeEmptySS() {
    const ssDiv = document.querySelector('#ss')!;
    ssDiv.innerHTML = '';
    const ssTable = makeElement('table');
    const header = makeElement('tr');
    const clearCell = makeElement('td');
    const clear = makeElement('button', { id: 'clear', type: 'button' }, 'Clear');
    clearCell.append(clear);
    header.append(clearCell);
    const A = 'A'.charCodeAt(0);
    for (let i = 0; i < N_COLS; i++) {
      header.append(makeElement('th', {}, String.fromCharCode(A + i)));
    }
    ssTable.append(header);
    for (let i = 0; i < N_ROWS; i++) {
      const row = makeElement('tr');
      row.append(makeElement('th', {}, (i + 1).toString()));
      const a = 'a'.charCodeAt(0);
      for (let j = 0; j < N_COLS; j++) {
        const colId = String.fromCharCode(a + j);
        const id = colId + (i + 1);
        const cell =
          makeElement('td', { id, class: 'cell', contentEditable: 'true' });
        row.append(cell);
      }
      ssTable.append(row);
    }
    ssDiv.append(ssTable);
  }

}



