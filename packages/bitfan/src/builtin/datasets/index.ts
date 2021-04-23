import * as sdk from "bitfan/sdk";
import fse from "fs-extra";
import path from "path";
import recursive from "recursive-readdir";
import BbPromise from "bluebird";
import _ from "lodash";

const allTypes: sdk.ProblemType[] = [
  "intent",
  "intent-topic",
  "lang",
  "multi-intent",
  "multi-intent-topic",
  "slot",
  "spell",
  "topic",
];

const ROOT_DIR = "../../../datasets";
const NAMESPACE_SEP = ".";

const fileNameFormat = /[a-zA-Z0-9_-]*\.[a-z]{2}\.(?:ds|doc)\.json$/;

const _makeFileName = (name: string, lang: string, app: "doc" | "ds") => {
  let fileName = name;
  fileName += `.${lang}`;
  fileName += `.${app}`;
  fileName += ".json";
  return fileName;
};

const _parseFileName = (fileName: string) => {
  const parts = fileName.split(".");
  parts.pop(); // rm .json
  parts.pop(); // rm .doc | .ds
  const lang = parts.pop()!;
  const name = parts.shift()!;

  return {
    name,
    lang,
  };
};

export const listFiles: typeof sdk.datasets.listFiles = async () => {
  const basePath = path.join(__dirname, ROOT_DIR);
  const types = allTypes.filter((t) => fse.existsSync(path.join(basePath, t)));
  return BbPromise.map(types, async (type) => {
    const basePathForType = path.join(basePath, type);
    const allFiles = await recursive(basePathForType);
    const matchingFiles = allFiles.filter(
      (f) => !!fileNameFormat.exec(path.basename(f))
    );

    return matchingFiles.map((f) => {
      const fPath = path.dirname(f);
      const fName = path.basename(f);

      const splitPath = (p: string) => p.split(path.sep);
      const namespace = _.xor(...[fPath, basePathForType].map(splitPath)).join(
        NAMESPACE_SEP
      );

      return <sdk.FileDef<sdk.ProblemType, sdk.FileType>>{
        ..._parseFileName(fName),
        type,
        namespace,
      };
    });
  }).then(_.flatten);
};

const _readFile = async <T extends sdk.ProblemType>(
  info: sdk.FileDef<T, sdk.FileType>
) => {
  const { lang, name, type, namespace } = info;
  const fName = _makeFileName(
    name,
    lang,
    info.fileType === "dataset" ? "ds" : "doc"
  );
  const fPath = path.join(
    __dirname,
    ROOT_DIR,
    type,
    namespace.split(NAMESPACE_SEP).join(path.sep) ?? "",
    fName
  );
  const fileContent = await fse.readFile(fPath, "utf8");
  return JSON.parse(fileContent);
};

export const readDataset: typeof sdk.datasets.readDataset = <
  T extends sdk.ProblemType
>(
  info: sdk.FileDef<T, "dataset">
) => {
  return _readFile(info);
};

export const readDocument: typeof sdk.datasets.readDocument = <
  T extends sdk.ProblemType
>(
  info: sdk.FileDef<T, "document">
) => {
  return _readFile(info);
};
