import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";

export async function loadSQL() {
  const asset = Asset.fromModule(require("../db/CALENDARIA.sql"));
  await asset.downloadAsync();
  const sqlString = await FileSystem.readAsStringAsync(asset.localUri!);
  return sqlString;
}
