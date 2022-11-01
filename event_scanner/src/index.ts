import { ethers } from "ethers";
import abi from "./abi.json";
import { EventFinder } from "./eventFinder";
import { ContractScanner } from "./scanner";
import { Slicer } from "./slicer";
import logger from "node-color-log";

const config = {
  // from env
  batchSize: Number(process.env.BATCH_SIZE) || 1000,
};

(async () => {
  const provider = new ethers.providers.JsonRpcProvider(
    "http://localhost:7545"
  );
  const slicer = new Slicer(config.batchSize);
  const scanner = new ContractScanner({
    provider,
    contractAddress: "0x86C05515d97FaF34E23bc031E49AE1F2742E077a",
    abi,
  });
  const eventFinder = new EventFinder(abi);

  const start = 0;
  const end = 4;
  const events = eventFinder.findEvents();

  await slicer.slice(start, end, async (start, end) => {
    logger.info(`Scanning from ${start} to ${end}`);
    const result = await scanner.scan(start, end, events);
  });
})();
