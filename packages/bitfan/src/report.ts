import * as sdk from "bitfan/sdk";
import _ from "lodash";

const evaluateMetrics: typeof sdk.evaluateMetrics = <T extends sdk.ProblemType>(
  results: sdk.Result<T>[],
  metrics: sdk.Metric<T>[]
): sdk.PerformanceReport => {
  const scores: sdk.ScoreInfo[] = [];
  const allSeeds = _.uniq(results.map((r) => r.metadata.seed));
  const allProblems = _.uniq(results.map((r) => r.metadata.problem));

  for (const problem of allProblems) {
    for (const seed of allSeeds) {
      const resultsOfComb = results.filter(
        (r) => r.metadata.seed === seed && r.metadata.problem === problem
      );
      if (resultsOfComb.length) {
        scores.push(
          ...metrics.map((m) => ({
            metric: m.name,
            problem,
            seed,
            score: m.eval(resultsOfComb),
          }))
        );
      }
    }
  }

  return {
    generatedOn: new Date(),
    scores,
  };
};
export default evaluateMetrics;
