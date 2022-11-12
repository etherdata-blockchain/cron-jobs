import { ethers } from "ethers";
import { erc20, erc721 } from "./abi";
import { ContractScanner } from "./Scanner";

jest.mock("ethers", () => {
  const contract = {
    queryFilter: jest.fn().mockResolvedValue([
      {
        blockNumber: 1,
        blockHash: "0x1",
        blockTimestamp: 1,
        address: "0x1",
        transaction: {
          hash: "0x1",
          index: 1,
          from: "0x1",
          to: "0x1",
          value: 1,
        },
        event: "Transfer",
        args: ["0x1", "0x1", { _hex: "0x1" }],
        getBlock: jest.fn().mockResolvedValue({
          number: 1,
          hash: "0x1",
          timestamp: 1,
        }),
        getTransaction: jest.fn().mockResolvedValue({
          hash: "0x1",
          index: 1,
          from: "0x1",
          to: "0x1",
          value: 1,
        }),
      },
      {
        blockNumber: 2,
        blockHash: "0x2",
        blockTimestamp: 2,
        address: "0x2",
        transaction: {
          hash: "0x2",
          index: 2,
          from: "0x2",
          to: "0x2",
          value: 2,
        },
        event: "Transfer",
        args: {},
        getBlock: jest.fn().mockResolvedValue({
          number: 2,
          hash: "0x2",
          timestamp: 2,
        }),
        getTransaction: jest.fn().mockResolvedValue({
          hash: "0x2",
          index: 2,
          from: "0x2",
          to: "0x2",
          value: 2,
        }),
      },
    ]),
  };
  const provider = {
    getBlockNumber: jest.fn(),
  };
  const ethers = {
    Contract: jest.fn().mockImplementation(() => contract),
    providers: {
      Provider: jest.fn().mockReturnValue(provider),
    },
    utils: {
      hexValue: jest.fn().mockReturnValue("0x1"),
    },
  };
  return { ethers };
});

describe("Given a scanner", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Should scan the contract", async () => {
    const provider = jest.fn();
    const scanner = new ContractScanner({
      provider: provider as any,
      contractAddress: "0x123",
      abis: [erc20, erc721],
    });
    const results = await scanner.scan(0, 1);
    expect(ethers.Contract).toBeCalledTimes(2);
    expect(results).toHaveLength(1);
  });

  it("Should scan the contract without abis", async () => {
    const provider = jest.fn();
    const scanner = new ContractScanner({
      provider: provider as any,
      contractAddress: "0x123",
      abis: [],
    });
    const results = await scanner.scan(0, 1);
    expect(ethers.Contract).toBeCalledTimes(4);
    expect(results).toHaveLength(1);
  });
});
