import * as sdk from "bitfan/sdk";
import _ from "lodash";

export const transposeTable: typeof sdk.tables.transposeTable = <D>(
  table: _.Dictionary<_.Dictionary<D>>
) => {
  const columns = Object.keys(table);

  let rows: string[] = [];
  for (const col of columns) {
    rows = [...rows, ...Object.keys(table[col])];
  }
  rows = _.uniq(rows);

  const flipped = _.zipObject(
    rows,
    rows.map((r) => ({}))
  );

  for (const row of rows) {
    flipped[row] = _.zipObject(
      columns,
      columns.map((c) => table[c][row])
    );
  }

  return flipped;
};
