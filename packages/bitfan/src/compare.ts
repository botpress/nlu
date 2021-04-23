import * as sdk from "bitfan/sdk";
import _ from "lodash";
import { initDic } from "./builtin/tables/init";

export default function comparePerformances(
  currentPerformance: sdk.PerformanceReport,
  previousPerformance: sdk.PerformanceReport,
  options?: Partial<sdk.CompareOptions>
): sdk.ComparisonReport {
  const currentMetrics = _.uniq(
    currentPerformance.scores.map((s) => s.metric)
  ).sort();
  const currentProblems = _.uniq(
    currentPerformance.scores.map((s) => s.problem)
  ).sort();
  const currentSeeds = _.uniq(
    currentPerformance.scores.map((s) => s.seed)
  ).sort();

  const defaultTolerance = initDic(currentMetrics, () => 0);
  const userDefinedTolerance = options?.toleranceByMetric ?? {};
  const toleranceByMetric = {
    ...defaultTolerance,
    ...userDefinedTolerance,
  };

  const reasons: sdk.RegressionReason[] = [];
  for (const metric of currentMetrics) {
    for (const problem of currentProblems) {
      for (const seed of currentSeeds) {
        const isComb = (s: sdk.ScoreInfo) =>
          s.metric === metric && s.problem === problem && s.seed === seed;
        const current = currentPerformance.scores.find(isComb);
        const previous = previousPerformance.scores.find(isComb);

        const combination = `{ metric: ${metric}, problem: ${problem}, seed: ${seed} }`;
        if (!previous && !current) {
          continue;
        } else if (!previous) {
          throw new Error(
            `No score could be found for combination ${combination} in previous performance.`
          );
        } else if (!current) {
          throw new Error(
            `No score could be found for combination ${combination} in current performance.`
          );
        }

        const currentScore = current.score;
        const previousScore = previous.score;

        const delta = toleranceByMetric[metric] * previousScore;

        if (currentScore + delta < previousScore) {
          reasons.push({
            status: "regression",
            metric,
            problem,
            seed,
            currentScore,
            previousScore,
            allowedRegression: -delta,
          });
        } else if (currentScore < previousScore) {
          reasons.push({
            status: "tolerated-regression",
            metric,
            problem,
            seed,
            currentScore,
            previousScore,
            allowedRegression: -delta,
          });
        }
      }
    }
  }

  let status: sdk.RegressionStatus;
  if (reasons.some((r) => r.status === "regression")) {
    status = "regression";
  } else if (reasons.some((r) => r.status === "tolerated-regression")) {
    status = "tolerated-regression";
  } else {
    status = "success";
  }

  return {
    status,
    reasons,
  };
}
