// Compiled with the tests to verify ESM consumers resolve the ESM declarations.
import {
    type MovingAIMap,
    type MovingAIScene,
    parseMapString,
    parseScenString,
} from "movingai2json";

export const map: MovingAIMap = parseMapString(
    "type octile\nheight 1\nwidth 1\nmap\n.",
);
export const scenarios: MovingAIScene = parseScenString("version 1\n");
