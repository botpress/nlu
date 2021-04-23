import { DataSet, ProblemType, Sample, sampling } from "bitfan/sdk";
import { LoDashStatic } from "lodash";
import { areSame } from "../labels";
import SeededLodashProvider from "../../services/seeded-lodash";

export const subSample: typeof sampling.subSample = <T extends ProblemType>(
  dataset: DataSet<T>,
  percent: number,
  seed: number,
  options = { stratificate: true }
): DataSet<T> => {
  const { trainSet } = trainTestSplit(dataset, percent, seed, options);
  return trainSet;
};

export const trainTestSplit: typeof sampling.trainTestSplit = <
  T extends ProblemType
>(
  dataset: DataSet<T>,
  trainPercent: number,
  seed: number,
  options = { stratificate: true }
): {
  trainSet: DataSet<T>;
  testSet: DataSet<T>;
} => {
  if (trainPercent < 0 || trainPercent > 1) {
    let msg = `trainTestSplit function cannot make a train set with ${trainPercent} of all samples. Must be between 0 and 1`;
    throw new Error(msg);
  }

  const seededLodashProvider = new SeededLodashProvider();
  seededLodashProvider.setSeed(seed);
  const lo = seededLodashProvider.getSeededLodash();

  const allClasses = lo.uniqWith(
    dataset.samples.map((r) => r.label),
    areSame
  );

  const trainSamples: Sample<T>[] = [];
  const testSamples: Sample<T>[] = [];

  if (options.stratificate) {
    // preserve proportions of each class
    for (const c of allClasses) {
      const samplesOfClass = dataset.samples.filter((r) => areSame(r.label, c));
      const split = _splitOneClass(samplesOfClass, trainPercent, lo);
      trainSamples.push(...split.trainSamples);
      testSamples.push(...split.testSamples);
    }
  } else {
    const split = _splitOneClass(dataset.samples, trainPercent, lo);
    trainSamples.push(...split.trainSamples);
    testSamples.push(...split.testSamples);
  }

  seededLodashProvider.resetSeed();

  const trainSet: DataSet<T> = { ...dataset, samples: trainSamples };
  const testSet: DataSet<T> = { ...dataset, samples: testSamples };
  return {
    trainSet,
    testSet,
  };
};

const _splitOneClass = <T extends ProblemType>(
  samplesOfClass: Sample<T>[],
  trainPercent: number,
  seededLodash: LoDashStatic
): {
  trainSamples: Sample<T>[];
  testSamples: Sample<T>[];
} => {
  const N = samplesOfClass.length;
  const trainSize = Math.floor(trainPercent * N);

  const allIdx = seededLodash.shuffle(seededLodash.range(N));
  const trainIdx = allIdx.slice(0, trainSize);
  const testIdx = allIdx.slice(trainSize);

  const trainSamples = samplesOfClass.filter((r, i) => trainIdx.includes(i));
  const testSamples = samplesOfClass.filter((r, i) => testIdx.includes(i));

  return {
    trainSamples,
    testSamples,
  };
};
