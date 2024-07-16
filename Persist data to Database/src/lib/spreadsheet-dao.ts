import { Result, okResult, errResult } from 'cs544-js-utils';

import * as mongo from 'mongodb';

/** All that this DAO should do is maintain a persistent map from
 *  [spreadsheetName, cellId] to an expression string.
 *
 *  Most routines return an errResult with code set to 'DB' if
 *  a database error occurs.
 */

/** return a DAO for spreadsheet ssName at URL mongodbUrl */
export async function
makeSpreadsheetDao(mongodbUrl: string, ssName: string)
  : Promise<Result<SpreadsheetDao>> 
{
  return SpreadsheetDao.make(mongodbUrl, ssName);
}
const DEFAULT_COUNT = 15;

type DbData = {'cellId':string,'expr':string} & { _id?: mongo.ObjectId };
export class SpreadsheetDao {

  private client: mongo.MongoClient;
  private spreadsheet: mongo.Collection;
  private ssName:string;
  
  constructor(params: { [key: string]: any }) {
    this.client = params.client;
    this.spreadsheet = params.spreadsheet;
    this.ssName = params.ssName;
  }

  
  //factory method
  static async make(dbUrl: string, ssName: string)
    : Promise<Result<SpreadsheetDao>>
  {
    const params: { [key: string]: any } = {};
    try {
      params.ssName = ssName;
      params.client = await (new mongo.MongoClient(dbUrl)).connect();
      const db = params.client.db();
      const spreadsheet = db.collection(ssName);
      params.spreadsheet = spreadsheet; 
      await spreadsheet.createIndex('cellId');
      return okResult(new SpreadsheetDao(params));
    }
    catch (error) {
      return errResult(error.message, 'DB');
    }
  }

  /** Release all resources held by persistent spreadsheet.
   *  Specifically, close any database connections.
   */
  async close() : Promise<Result<undefined>> {
    try {
      await this.client.close();
      return okResult(undefined);
    }
    catch (e) {
      return errResult(e.message, 'DB');
    }
  }

  /** return name of this spreadsheet */
  getSpreadsheetName() : string {
    return this.ssName;
  }

  /** Set cell with id cellId to string expr. */
  async setCellExpr(cellId: string, expr: string)
    : Promise<Result<undefined>>
  {
    try{
      const collection = this.spreadsheet;
      const document = {cellId,expr};
      await collection.insertOne(document);
      return okResult(undefined);
    }
    catch(e){
      return errResult(e.message, 'DB');
    }
  }

  /** Return expr for cell cellId; return '' for an empty/unknown cell.
   */
  async query(cellId: string) : Promise<Result<string>> {
    try {
      const index: number = 0;
      const count: number = DEFAULT_COUNT;
      const collection = this.spreadsheet;
      const cursor = await collection.find({cellId});
      const dbEntries = await cursor
            .sort({userId: 1}).skip(index).limit(count).toArray();
      if(dbEntries.length === 0)
        return okResult('')
      const entries = dbEntries.map(d => {
        const e = {...(d as DbData)};
	      delete e._id; //do not expose implementation details
        return e.expr;
      });
     return okResult(entries[0]);
    }
    catch (e) {
      return errResult(e.message, 'DB');
    }
  }

  /** Clear contents of this spreadsheet */
  async clear() : Promise<Result<undefined>> {
    try {
      await this.spreadsheet.deleteMany({});
      return okResult(undefined);
    }
    catch (e) {
      return errResult(e.message, 'DB');
    }
  }

  /** Remove all info for cellId from this spreadsheet. */
  async remove(cellId: string) : Promise<Result<undefined>> {
    try {
      const collection = this.spreadsheet;
      const delResult = await collection.deleteOne({ cellId });
      if (!delResult) {
        return errResult(`unexpected falsy DeleteResult`, { code: 'DB' });
      }
      else {
        return okResult(undefined);
      }
    }
    catch (e) {
      return errResult(e.message, 'DB');
    }
  }

  /** Return array of [ cellId, expr ] pairs for all cells in this
   *  spreadsheet
   */
  async getData() : Promise<Result<[string, string][]>> {
    try{
      const collection = this.spreadsheet;
      const cursor = collection.find();
      const dbEntries = await cursor.toArray();
      const entries:[string,string][] = dbEntries.map(d => {
        const e = {...(d as DbData)};
        delete e._id; //not to expose the implementation details
        return [e.cellId,e.expr];
        });
      return okResult(entries);
    }
    catch(e){
      return errResult(e.message, 'DB');
    }
  }

}




