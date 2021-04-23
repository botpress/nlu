import * as sdk from "bitfan/sdk";
import _ from "lodash";

export const initDic: typeof sdk.tables.initDic = <T>(
  props: string[],
  valueGenerator: () => T
): _.Dictionary<T> => {
  const values: T[] = new Array<number>(props.length)
    .fill(0)
    .map(valueGenerator);
  return _.zipObject(props, values);
};

export const initTable: typeof sdk.tables.initTable = <T extends any>(
  rows: string[],
  columns: string[],
  init: () => T
) => {
  const perRow = initDic(columns, init);
  return initDic(rows, () => _.cloneDeep(perRow));
};
