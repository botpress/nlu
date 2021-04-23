import { DataSet, ProblemType, visualisation } from "bitfan/sdk";
import chalk from "chalk";
import _ from "lodash";
import { areSame, isOOS, makeKey } from "../../builtin/labels";
import { roundDic } from "../tables/round";
import { transposeTable } from "../tables/transpose";

export const showClassDistribution: typeof visualisation.showClassDistribution = (
  ...datasets: DataSet<ProblemType>[]
) => {
  const distributions: _.Dictionary<_.Dictionary<number>> = {};
  for (const ds of datasets) {
    const distribution = _getClassDistributionForOneSet(ds);
    distributions[ds.name] = roundDic(distribution, 4);
  }

  console.log(chalk.green(`Class Distribution`));
  console.table(transposeTable(distributions));
};

export const showDatasetsSummary: typeof visualisation.showDatasetsSummary = (
  ...datasets: DataSet<ProblemType>[]
) => {
  const summaries: _.Dictionary<_.Dictionary<number>> = {};
  for (const ds of datasets) {
    const amountOfSamples = ds.samples.length;
    const classes = _.uniqWith(
      ds.samples.map((r) => r.label),
      areSame
    ).filter((c) => !isOOS(c));

    const amountOfSamplesPerClass = classes.map(
      (c) => ds.samples.filter((r) => areSame(r.label, c)).length
    );
    const avgSamplesPerClass =
      _.sum(amountOfSamplesPerClass) / amountOfSamplesPerClass.length;

    const maxSamplesPerClass = _.max(amountOfSamplesPerClass) ?? 0;
    const minSamplesPerClass = _.min(amountOfSamplesPerClass) ?? 0;

    const amountOfClass = classes.length;

    const oosSamples = ds.samples.filter((r) => isOOS(r.label)).length;

    const summary = {
      amountOfSamples,
      amountOfClass,
      avgSamplesPerClass,
      maxSamplesPerClass,
      minSamplesPerClass,
      oosSamples,
    };
    summaries[ds.name] = roundDic(summary, 4);
  }

  console.log(chalk.green(`Dataset summary`));
  console.table(transposeTable(summaries));
};

const _getClassDistributionForOneSet = <T extends ProblemType>(
  dataset: DataSet<T>
) => {
  const { samples } = dataset;

  const allLabels = _.uniqWith(
    samples.map((r) => r.label),
    areSame
  );

  const distribution = _.zipObject(
    allLabels.map(makeKey),
    allLabels.map((x) => 0)
  );

  const N = samples.length;
  for (const label of allLabels) {
    distribution[makeKey(label)] =
      samples.filter((r) => areSame(label, r.label)).length / N;
  }

  return distribution;
};
