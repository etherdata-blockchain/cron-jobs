import { ethers } from "ethers";
import { FoundEvent } from "./EventFinder";

interface Props {
  provider: ethers.providers.Provider;
  contractAddress: string;
  abi: any;
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

export class ContractScanner {
  provider: ethers.providers.Provider;
  contractAddress: string;
  abi: any;

  constructor({ provider, contractAddress, abi }: Props) {
    this.provider = provider;
    this.contractAddress = contractAddress;
    this.abi = abi;
  }

  /**
   * Scan the blockchain for events emitted by the contract.
   */
  async scan(from: number, to: number, events: FoundEvent[]): Promise<Event[]> {
    const contract = new ethers.Contract(
      this.contractAddress,
      this.abi,
      this.provider
    );

    let scannedEvents: ethers.Event[] = [];
    for (const event of events) {
      scannedEvents = scannedEvents.concat(
        await contract.queryFilter(event.name, from, to)
      );
    }
    const returnedEvents: Event[] = [];
    let index = 0;
    for (const event of scannedEvents) {
      const {
        blockNumber,
        blockHash,
        address,
        transactionHash,
        event: name,
      } = event;
      const args: any = event.args || {};

      const block = await event.getBlock();
      const transaction = await event.getTransaction();
      const argsFiltered = this.filterArgs(events[index], args);

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

    return returnedEvents;
  }

  private filterArgs(foundEvent: FoundEvent, args: ethers.utils.Result): any {
    const returnedArgs = [];
    let index = 0;
    for (const input of foundEvent.inputs) {
      const { name, type, indexed } = input;
      let value = args[index];
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
