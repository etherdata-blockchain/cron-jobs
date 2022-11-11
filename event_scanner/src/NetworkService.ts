import axios from "axios";
import { ethers } from "ethers";
import logger from "node-color-log";

interface Page<T> {
  items: T[];
  metadata: {
    total: number;
    per: number;
    page: number;
  };
}

interface Contract {
  source: string;
  abi?: string;
  bytecode: string;
  compiler: string;
  address: string;
  lastScannedBlock: number;
  blockNumber: string;
}

export class NetworkService {
  url: string;
  signer: ethers.Signer;
  authenticationToken?: string;

  constructor(url: string, signer: ethers.Signer) {
    this.url = url;
    this.signer = signer;
  }

  async auth(): Promise<void> {
    let url = "https://functions.video2.trade/api/metamask/signIn";
    let message = await this.signer.signMessage("login");
    let data = {
      message: "login",
      signature: message,
      address: await this.signer.getAddress(),
    };
    let response = await axios.post(url, data);
    this.authenticationToken = response.data.accessToken;
  }

  async getContracts(page: number = 1): Promise<Page<Contract>> {
    const response = await axios.get(
      `${this.url}/contract?page=${page}&showAbi=true`,
      {
        headers: {
          Authorization: `Bearer ${this.authenticationToken}`,
        },
      }
    );
    return response.data;
  }

  async uploadEvents(
    contractAddress: string,
    events: any,
    lastScannedBlock: number
  ): Promise<void> {
    const data = {
      lastScannedBlock,
      events,
    };
    try {
      await axios.post(`${this.url}/event/${contractAddress}`, data, {
        headers: {
          Authorization: `Bearer ${this.authenticationToken}`,
        },
      });
    } catch (e: any) {
      logger.error(
        `Unable to upload events for contract ${contractAddress} due to ${e}`
      );
    }
  }
}
