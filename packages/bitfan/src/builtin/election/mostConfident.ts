import * as sdk from "bitfan/sdk";
import _ from "lodash";
import { isOOS } from "../labels";

export const mostConfident: typeof sdk.election.mostConfident = <
  T extends sdk.ProblemType
>(
  candidates: sdk.Candidate<T>[],
  opt?: Partial<{
    ignoreOOS: boolean;
  }>
) => {
  return mostConfidents(candidates, 1, opt)[0];
};

export const mostConfidents: typeof sdk.election.mostConfidents = <
  T extends sdk.ProblemType
>(
  candidates: sdk.Candidate<T>[],
  n: number,
  opt?: Partial<{
    ignoreOOS: boolean;
  }>
) => {
  const option = { ...{ ignoreOOS: false }, ...(opt ?? {}) };
  const keepCandidate = (c: sdk.Candidate<T>) =>
    !option.ignoreOOS || !isOOS(c.elected);

  return _(candidates)
    .orderBy((p) => p.confidence, "desc")
    .filter(keepCandidate)
    .take(n)
    .map((p) => p.elected)
    .value();
};
