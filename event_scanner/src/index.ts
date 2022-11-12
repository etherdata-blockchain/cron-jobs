import dotenv from "dotenv";
import { ethers } from "ethers";
import logger from "node-color-log";
import { NetworkService } from "./NetworkService";
import { ContractScanner } from "./Scanner";
import { Slicer } from "./Slicer";

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

  // login to the server
  await networkService.auth();
  // merge abi. This is the default abi for those contracts that do provide an abi

  let retry = 0;

  while (true) {
    try {
      const contracts = await networkService.getContracts(currentPage);
      if (contracts.items.length === 0) {
        break;
      }

      for (const contract of contracts.items) {
        logger.success(`Scanning ${contract.address}...`);
        let abi: any[] = [];
        if (contract.abi) {
          abi = [contract.abi!];
        }

        const scanner = new ContractScanner({
          provider,
          contractAddress: contract.address,
          abis: abi,
        });

        // start scanning using block number if last scanned block is less than contract's block number
        const blockNumber = Number(contract.blockNumber);

        const start: number =
          blockNumber < contract.lastScannedBlock
            ? contract.lastScannedBlock
            : blockNumber - 1;
        const end: number = await provider.getBlockNumber();

        await slicer.slice(start, end, async (start, end) => {
          logger.info(`Scanning from ${start} to ${end}`);
          const result = await scanner.scan(start, end);
          logger.info(
            `Sending ${result.length} events ${result.reduce(
              (acc, curr) => acc + "," + curr.event,
              ""
            )}`
          );
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
