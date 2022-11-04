import { ethers } from "ethers";
import { ContractScanner } from "./Scanner";

describe("Given a scanner", () => {
  it("Should skip the contract", () => {
    const scanner = new ContractScanner({
      provider: new ethers.providers.JsonRpcProvider(""),
      contractAddress: "0x123",
      abi: undefined,
    });
    expect(scanner.scan(0, 1, [])).resolves.toEqual([]);
  });

  it("Should skip the contract", () => {
    const scanner = new ContractScanner({
      provider: new ethers.providers.JsonRpcProvider(""),
      contractAddress: "0x123",
      abi: null,
    });
    expect(scanner.scan(0, 1, [])).resolves.toEqual([]);
  });
});
