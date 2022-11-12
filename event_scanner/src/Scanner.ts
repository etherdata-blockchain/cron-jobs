import { ethers } from "ethers";
import logger from "node-color-log";
import { type } from "os";
import { erc1155, erc20, erc721, erc777 } from "./abi";
import { EventFinder, FoundEvent } from "./EventFinder";

interface Props {
  provider: ethers.providers.Provider;
  contractAddress: string;
  abis: ABI[];
}

interface Event {
  blockNumber: string;
  blockHash: string;
  blockTimestamp: string;
  address: string;
  transaction: {
    hash: string;
    index: string;
    from: string;
    to: string;
    value: string;
  };
  event: string;
  data: { name: string; value: string; indexed: boolean; type: string }[];
}

type ABI = { [key: string]: any }[];

export class ContractScanner {
  provider: ethers.providers.Provider;
  contractAddress: string;
  abis: ABI[];

  constructor({ provider, contractAddress, abis }: Props) {
    this.provider = provider;
    this.contractAddress = contractAddress;
    if (abis.length === 0) {
      logger.warn("Contract without ABI, using default ABI");
      this.abis = [erc20, erc721, erc777, erc1155];
    } else {
      logger.info("Using custom ABI");
      this.abis = abis;
    }
  }

  /**
   * Scan the blockchain for events emitted by the contract.
   */
  async scan(from: number, to: number): Promise<Event[]> {
    const returnedEvents: Event[] = [];

    for (const abi of this.abis) {
      const contract = new ethers.Contract(
        this.contractAddress,
        abi,
        this.provider
      );
      let scannedEvents: ethers.Event[] = [];
      const eventFinder = new EventFinder(abi);
      const events = eventFinder.findEvents();
      for (const event of events) {
        scannedEvents = scannedEvents.concat(
          await contract.queryFilter(event.name, from, to)
        );
      }

      for (const event of scannedEvents) {
        const {
          blockNumber,
          blockHash,
          address,
          transactionHash,
          event: name,
        } = event;
        const args: any = event.args || {};
        if (args === undefined || args === null) {
          continue;
        }
        const block = await event.getBlock();
        const transaction = await event.getTransaction();

        for (const foundEvent of events) {
          const argsFiltered = this.filterArgs(foundEvent, args);
          if (argsFiltered.length === 0) {
            continue;
          }

          returnedEvents.push({
            blockNumber: ethers.utils.hexValue(blockNumber),
            blockHash,
            blockTimestamp: ethers.utils.hexValue(block.timestamp),
            address,
            transaction: {
              hash: transactionHash,
              index: ethers.utils.hexValue(event.transactionIndex),
              from: transaction.from,
              to: transaction.to!,
              value: transaction.value._hex,
            },
            event: name || "",
            data: argsFiltered,
          });
        }
      }
    }

    return returnedEvents;
  }

  private filterArgs(foundEvent: FoundEvent, args: ethers.utils.Result): any[] {
    const returnedArgs = [];
    let index = 0;
    if (Object.keys(args).length === 0) {
      logger.error("No args found");
      return [];
    }
    for (const input of foundEvent.inputs) {
      const { name, type, indexed } = input;
      let value = args[index];
      if (value === undefined) {
        index++;
        continue;
      }
      if (value._hex !== undefined) {
        value = value._hex;
      }
      returnedArgs.push({
        name,
        type,
        indexed,
        value: value,
      });
      index++;
    }
    return returnedArgs;
  }
}
