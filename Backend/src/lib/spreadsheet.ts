import { default as parse, CellRef, Ast } from './expr-parser.js';

import { Result, okResult, errResult } from 'cs544-js-utils';

//factory method
export default async function makeSpreadsheet(name: string):
  Promise<Result<Spreadsheet>> {
  return okResult(new Spreadsheet(name));
}

type Updates = { [cellId: string]: number };
type Cell = { [cellId: string]: CellInfo };
export class Spreadsheet {

  readonly name: string;
  cell: Cell;//to have all the cellId's and their cell Info's
  prev: Cell;//for error recovery
  result: any
  constructor(name: string) {
    this.name = name;
    this.cell = {};
    this.result = {};
    this.prev = {};
  }

  /** Set cell with id cellId to result of evaluating formula
   *  specified by the string expr.  Update all cells which are
   *  directly or indirectly dependent on the base cell cellId.
   *  Return an object mapping the id's of all updated cells to
   *  their updated values.  
   *
   *  Errors must be reported by returning an error Result having its
   *  code options property set to `SYNTAX` for a syntax error and
   *  `CIRCULAR_REF` for a circular reference and message property set
   *  to a suitable error message.
   */
  async eval(cellId: string, expr: string): Promise<Result<Updates>> {
    let ast: Result<Ast>;
    let cellInfo: CellInfo;
    if (this.cell[cellId]) {
      this.prev = this.cell;
    }
    cellInfo = {
      cellId: cellId,
      expr: expr,
      value: 0,
      dependents: new Set<String>()
    }
    this.cell = {
      ...this.cell, [cellId]:
        cellInfo
    }
    ast = parse(expr, cellId);
    if (!ast.isOk && ast.errors)
      return errResult(ast.errors[0].message, ast.errors[0].options.code);
    if (expr.includes(cellId)) {
      const errmsg = 'circular reference detected: ${cellId}=${this.cell[cellId].expr}.';
      return errResult(errmsg, "CIRCULAR_REF");
    }
    let value = this.astEval(ast, cellId);
    if (isNaN(value)) {
      const errmsg = 'circular reference detected: ${cellId}=${this.cell[cellId].expr}.';
      return errResult(errmsg, "CIRCULAR_REF");
    }
    this.cell[cellId].value = value;
    this.result = { [cellId]: value };
    this.prev = this.cell;
    this.checkCascade(cellId)
    return okResult(this.result);
  }
  //checks if cascade updates are needed
  checkCascade(cellId: string) {
    for (const key in this.cell) {
      if (this.cell[key].dependents?.has(cellId)) {
        const ast = parse(this.cell[key].expr, key);
        const val = this.astEval(ast, key);
        this.cell[key].value = val;
        this.result = { ...this.result, [key]: val }
      }
    }
  }
  //astEvaluation method
  astEval(ast: Result<Ast>, cellId: string): any {
    if (ast.isOk === true) {
      if (ast.val?.kind === "num") return ast.val.value;
      else if (ast.val?.kind === "app") {
        const result = this.evalAppKids(ast.val, cellId);
        return result;
      }
      else if (ast.val?.kind === "ref") {
        return this.evalRef(ast.val, cellId);
      }
    }
  }
  //evaluation in case of reference Ast
  evalRef(value: any, cellId: string): number {
    let baseCellRef: Result<CellRef>;
    baseCellRef = CellRef.parse(cellId);
    if (baseCellRef.isOk) {
      const baseCellReference: string = value.toText(baseCellRef.val);
      if (this.cell[baseCellReference] && this.cell[baseCellReference].dependents?.size !== 0) {
        const status: number = this.casdcadeDependents(cellId, baseCellReference);
        if (isNaN(status)) {
          return NaN;
        }
      }
      else if (/[a-z][0-9]+/.test(baseCellReference)) this.cell[cellId].dependents?.add(baseCellReference);
      const result = this.cell[baseCellReference]?.value;
      if (result) return result;
      return 0;
    }
    return 0;
  }
  //update the dependents and their attributes in case of cascade
  casdcadeDependents(cellId: string, baseCellReference: string): number {
    const dependents = this.cell[baseCellReference].dependents;
    if (dependents) {
      for (const dependent of dependents) {
        if (dependent === cellId) {
          this.cell[cellId].expr = this.prev[cellId].expr;
          this.cell[cellId].value = this.prev[cellId].value;
          return NaN;
        }
        this.cell[cellId].dependents?.add(dependent);

      }
    }
    return 0;
  }
  //recursive function to evaluate the app Ast kids 
  evalAppKids(value: Ast, cellId: string): number {
    let a: number;
    let b: number;
    if (value?.kind === "num") return value.value;
    else if (value.kind === "app") {
      let fn = value.fn;
      if (value.kids.length === 1 && value.kids[0].kind === "num") {
        if (fn === '+') return value.kids[0].value;
        else if (fn == '-') return -1 * value.kids[0].value;
      }
      else {
        if (value.kids[0].kind === "num")
          a = value.kids[0].value;
        else {
          a = this.evalAppKids(value.kids[0], cellId);
        }
        if (value.kids[1].kind === "num")
          b = value.kids[1].value;
        else {
          b = this.evalAppKids(value.kids[1], cellId);
        }
        return FNS[fn](a, b);
      }

    }
    else if (value.kind === "ref") {
      let refvariableValue: number;
      refvariableValue = this.evalRef(value, cellId);
      if (refvariableValue) return refvariableValue;
      else if (isNaN(refvariableValue)) return NaN;
      return 0;
    }
    return 0;
  }
}
//class to have all the attributes of a cell.
class CellInfo {
  cellId: string;
  expr: string;
  ast?: Ast;
  value: number;
  dependents?: Set<String>;
  constructor(cellId: string, expr: string, ast: Ast, dependents: Set<String>) {
    this.cellId = cellId;
    this.expr = expr;
    this.ast = ast;
    this.value = 0;
    this.dependents = dependents;
  }
}

const FNS = {
  '+': (a: number, b: number): number => a + b,
  '-': (a: number, b?: number): number => b === undefined ? -a : a - b,
  '*': (a: number, b: number): number => a * b,
  '/': (a: number, b: number): number => a / b,
  min: (a: number, b: number): number => Math.min(a, b),
  max: (a: number, b: number): number => Math.max(a, b),
}
