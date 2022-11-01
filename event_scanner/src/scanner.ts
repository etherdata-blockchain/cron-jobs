import { ethers } from "ethers";

interface Props {
  provider: ethers.providers.Provider;
  contractAddress: string;
  abi: any;
}

interface Event {
  blockNumber: number;
  blockHash: string;
  address: string;
  transactionHash: string;
  event: string;
  data: {
    [key: string]: any;
  };
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
  async scan(from: number, to: number, events: string[]): Promise<Event[]> {
    const contract = new ethers.Contract(
      this.contractAddress,
      this.abi,
      this.provider
    );

    let scannedEvents: ethers.Event[] = [];
    for (const event of events) {
      scannedEvents = scannedEvents.concat(
        await contract.queryFilter(event, from, to)
      );
    }

    const returnedEvents: Event[] = [];
    for (const event of scannedEvents) {
      const {
        blockNumber,
        blockHash,
        address,
        transactionHash,
        event: name,
      } = event;
      const args: any = event.args || {};

      // get args if key is not number
      const parsedArgs = Object.keys(args).filter((key) => isNaN(Number(key)));
      const filteredArgs = parsedArgs.map((key) => ({
        name: key,
        value: args[key],
      }));
      returnedEvents.push({
        blockNumber,
        blockHash,
        address,
        transactionHash,
        event: name || "",
        data: filteredArgs,
      });
    }

    return returnedEvents;
  }
}
