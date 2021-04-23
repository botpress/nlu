import * as sdk from "src/bitfan";
import fs from "fs";
import path from "path";

export default class DatasetRepository {
  public getDataset<T extends sdk.ProblemType>(
    type: T,
    lang: string,
    name: string
  ): sdk.DataSet<T> {
    const fName = this._makeFileName(lang, name);
    const fContent = fs.readFileSync(
      path.join(__dirname, "../../datasets", type, fName),
      "utf8"
    );
    return JSON.parse(fContent);
  }

  private _makeFileName(lang: string, name: string) {
    return `${name}.${lang}.json`;
  }
}
