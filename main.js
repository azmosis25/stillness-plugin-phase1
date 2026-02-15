import { waitForEvenAppBridge } from "@evenrealities/even_hub_sdk";
import { bootStillness } from "./master.js";

async function start() {
  const bridge = await waitForEvenAppBridge();
  await bootStillness(bridge);
}

start();