import * as sdk from "bitfan/sdk";

export const averageScore: typeof sdk.metrics.averageScore = <
  T extends sdk.ProblemType
>(
  criteria: sdk.Criteria<T>
) => ({
  name: `avgScore:${criteria.name}`,
  eval: (results: sdk.Result<T>[]) => {
    let sum = 0;
    for (const res of results) {
      sum += criteria.eval(res);
    }
    return sum / results.length;
  },
});
