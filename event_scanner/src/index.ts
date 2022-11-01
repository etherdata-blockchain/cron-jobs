import abi from "./abi.json";
import { ethers } from "ethers";
import { ContractScanner } from "./scanner";
import { Slicer } from "./slicer";
import { EventFinder } from "./eventFinder";

(async () => {
  const provider = new ethers.providers.JsonRpcProvider(
    "http://localhost:7545"
  );
  const slicer = new Slicer(2);
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
    console.log(`Scanning from ${start} to ${end}`);
    const result = await scanner.scan(start, end, events);
    console.log(result);
  });
})();
