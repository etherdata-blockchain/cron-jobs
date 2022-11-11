import { ethers } from "ethers";
import { EventFinder } from "./EventFinder";
import { ContractScanner } from "./Scanner";
import { Slicer } from "./Slicer";
import logger from "node-color-log";
import dotenv from "dotenv";
import { NetworkService } from "./NetworkService";
import { erc20, erc721, erc777, erc1155 } from "./abi";
import { ABIMerger } from "./ABIMerger";

dotenv.config();

(async () => {
  const config = {
    // from env
    batchSize: Number(process.env.BATCH_SIZE) || 1000,
    rpc: process.env.endpoint,
    pk: process.env.pk,
  };

  let currentPage = 1;
  if (config.rpc === undefined) {
    throw new Error("endpoint is not defined");
  }

  if (config.pk === undefined) {
    throw new Error("pk is not defined");
  }

  // web3
  const provider = new ethers.providers.JsonRpcProvider(config.rpc);
  const signer = new ethers.Wallet(config.pk!);
  // server
  const networkService = new NetworkService(process.env.url!, signer);
  // helper
  const slicer = new Slicer(config.batchSize);
  const abiMerger = new ABIMerger([erc721, erc777, erc1155, erc20]);

  // login to the server
  await networkService.auth();
  // merge abi. This is the default abi for those contracts that do provide an abi
  const mergedABI = abiMerger.merge();

  let retry = 0;

  while (true) {
    try {
      const contracts = await networkService.getContracts(currentPage);
      if (contracts.items.length === 0) {
        break;
      }

      for (const contract of contracts.items) {
        logger.success(`Scanning ${contract.address}...`);
        if (contract.abi === undefined || contract.abi === null) {
          logger.warn("Contract without ABI, using default ABI");
          contract.abi = mergedABI;
        }
        const scanner = new ContractScanner({
          provider,
          contractAddress: contract.address,
          abi: contract.abi,
        });
        const eventFinder = new EventFinder(contract.abi);

        // start scanning using block number if last scanned block is less than contract's block number
        const blockNumber = Number(contract.blockNumber);

        const start: number =
          contract.lastScannedBlock < blockNumber
            ? blockNumber
            : contract.lastScannedBlock;
        const end: number = await provider.getBlockNumber();
        const events = eventFinder.findEvents();

        await slicer.slice(start, end, async (start, end) => {
          logger.info(`Scanning from ${start} to ${end}`);
          const result = await scanner.scan(start, end, events);
          logger.info(`Sending ${result.length} events`);
          await networkService.uploadEvents(contract.address, result, end);
        });
        retry = 0;
      }
    } catch (e) {
      logger.error(e);
      retry++;
    }
    if (retry > 5) {
      logger.error("Too many retries, exiting");
      break;
    }

    currentPage++;
  }
})();
