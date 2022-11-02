import { ethers } from "ethers";
import { EventFinder } from "./EventFinder";
import { ContractScanner } from "./Scanner";
import { Slicer } from "./Slicer";
import logger from "node-color-log";
import dotenv from "dotenv";
import { NetworkService } from "./NetworkService";

const config = {
  // from env
  batchSize: Number(process.env.BATCH_SIZE) || 100,
};

dotenv.config();

(async () => {
  let currentPage = 1;
  if (process.env.endpoint === undefined) {
    throw new Error("endpoint is not defined");
  }

  if (process.env.pk === undefined) {
    throw new Error("pk is not defined");
  }

  const provider = new ethers.providers.JsonRpcProvider(process.env.endpoint!);
  const signer = new ethers.Wallet(process.env.pk!);
  const networkService = new NetworkService(process.env.url!, signer);
  const slicer = new Slicer(config.batchSize);
  await networkService.auth();

  while (true) {
    try {
      const contracts = await networkService.getContracts(currentPage);
      if (contracts.items.length === 0) {
        break;
      }

      for (const contract of contracts.items) {
        logger.info(`Scanning ${contract.address}...`);
        const scanner = new ContractScanner({
          provider,
          contractAddress: contract.address,
          abi: contract.abi,
        });
        const eventFinder = new EventFinder(contract.abi);

        const start: number = contract.lastScannedBlock;
        const end: number = await provider.getBlockNumber();
        const events = eventFinder.findEvents();
        await slicer.slice(start, end, async (start, end) => {
          logger.info(`Scanning from ${start} to ${end}`);
          const result = await scanner.scan(start, end, events);
          logger.info(`Sending ${result.length} events`);
          await networkService.uploadEvents(contract.address, result, end);
        });
      }
    } catch (e) {
      logger.error(e);
    }
    currentPage++;
  }
})();
