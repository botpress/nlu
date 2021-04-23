import { DataSet, SingleLabel, Sample, sampling, Label } from "bitfan/sdk";
import _ from "lodash";
import { areSame, getOOSLabel } from "../labels";
import SeededLodashProvider from "../../services/seeded-lodash";

export const splitOOS: typeof sampling.splitOOS = <T extends SingleLabel>(
  dataset: DataSet<T>,
  labels: Label<T>[]
) => {
  const { samples } = dataset;

  const samplesOfLabel = samples.filter((r) =>
    labels.some((l) => areSame(r.label, l))
  );

  const otherSamples = samples.filter(
    (r) => !labels.some((l) => areSame(r.label, l))
  );

  const oosSamples: Sample<SingleLabel>[] = samplesOfLabel.map((r) => ({
    ...r,
    label: getOOSLabel(),
  }));

  const inScopeSet: DataSet<T> = { ...dataset, samples: otherSamples };
  const ooScopeSet: DataSet<T> = { ...dataset, samples: oosSamples };

  return { inScopeSet, ooScopeSet };
};

export const pickOOS: typeof sampling.pickOOS = <T extends SingleLabel>(
  dataset: DataSet<T>,
  oosPercent: number,
  seed: number
) => {
  const { samples } = dataset;

  const N = samples.length;
  const oosSize = oosPercent * N;

  const seededLodashProvider = new SeededLodashProvider();
  seededLodashProvider.setSeed(seed);
  const lo = seededLodashProvider.getSeededLodash();

  const allLabels = lo.uniqWith(
    samples.map((r) => r.label),
    areSame
  );
  const shuffledLabels = lo.shuffle(allLabels);

  let i = 0;
  const testSamples: Sample<T>[] = [];
  const pickedLabels: Label<T>[] = [];
  while (testSamples.length <= oosSize) {
    const label = shuffledLabels[i++];
    const samplesOfLabel = samples.filter((r) => areSame(r.label, label));
    testSamples.push(...samplesOfLabel);
    pickedLabels.push(label);
  }

  return pickedLabels;
};
