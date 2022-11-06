import { ABIMerger } from "./ABIMerger";

describe("Given a ABIMerger", () => {
  describe("When merging two ABI files", () => {
    it("Then it should merge them", () => {
      let abi1 = [
        {
          name: "Approval",
          type: "event",
        },
      ];

      let abi2 = [
        {
          name: "Transfer",
          type: "event",
        },
      ];

      const abiMerger = new ABIMerger([abi1, abi2]);
      const mergedABI = abiMerger.merge();
      expect(mergedABI).toStrictEqual([
        {
          name: "Approval",
          type: "event",
        },
        {
          name: "Transfer",
          type: "event",
        },
      ]);
    });

    it("Then it should merge them", () => {
      let abi1 = [
        {
          name: "Approval",
          type: "event",
        },
      ];

      let abi2 = [
        {
          name: "Transfer",
          type: "event",
        },
      ];

      const abiMerger = new ABIMerger([abi1, abi2, abi2]);
      const mergedABI = abiMerger.merge();
      expect(mergedABI).toStrictEqual([
        {
          name: "Approval",
          type: "event",
        },
        {
          name: "Transfer",
          type: "event",
        },
      ]);
    });
  });
});
