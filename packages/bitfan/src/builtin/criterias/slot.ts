import * as sdk from "bitfan/sdk";
import _ from "lodash";

export const slotsAre: typeof sdk.criterias.slotsAre = {
  name: "slotsAre",
  eval: (res: sdk.Prediction<"slot">): number => {
    return slotIncludes.eval(res) === 1 && slotCountIs.eval(res) === 1 ? 1 : 0;
  },
};

export const slotIncludes: typeof sdk.criterias.slotIncludes = {
  name: "slotIncludes",
  eval: (res: sdk.Prediction<"slot">): number => {
    if (!res.label.length) {
      return 1;
    }

    let score = 0;
    for (const slot of res.label) {
      const pred = res.candidates
        .map((c) => c.elected)
        .find((s) => s.name === slot.name);
      if (pred) {
        score += pred.start === slot.start && pred.end === slot.end ? 1 : 0;
      }
    }
    return score / res.label.length;
  },
};

export const slotCountIs: typeof sdk.criterias.slotCountIs = {
  name: "slotCountIs",
  eval: (res: sdk.Prediction<"slot">): number => {
    const success = res.label.length === res.candidates.length;
    return success ? 1 : 0;
  },
};
