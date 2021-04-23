import * as sdk from "bitfan/sdk";
import _ from "lodash";
import { initTable } from "./init";

export const tabelize: typeof sdk.tables.tabelize = <D>(
  data: D[],
  disposition: {
    row: (d: D) => string;
    column: (d: D) => string;
    score: (d: D) => number;
    agg?: (scores: number[]) => number;
  }
): sdk.Dic<sdk.Dic<number>> => {
  const average = (n: number[]) => _.sum(n.filter(_.isNumber)) / n.length;
  const aggregator = disposition.agg ?? average;

  const allRows = data.map((d) => disposition.row(d));
  const allColumns = data.map((d) => disposition.column(d));

  const rawTable = initTable<number[]>(allRows, allColumns, () => []);

  for (const d of data) {
    rawTable[disposition.row(d)][disposition.column(d)].push(
      disposition.score(d)
    );
  }

  const table = initTable<number>(allRows, allColumns, () => 0);
  for (const row of allRows) {
    for (const column of allColumns) {
      table[row][column] = aggregator(rawTable[row][column]);
    }
  }

  return table;
};
