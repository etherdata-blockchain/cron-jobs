import { EventFinder } from "./EventFinder";

describe("Given a eventFinder", () => {
  it("should find all events", () => {
    const abi = [
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "address",
            name: "owner",
            type: "address",
          },
          {
            indexed: true,
            internalType: "address",
            name: "spender",
            type: "address",
          },

          {
            indexed: false,
            internalType: "uint256",
            name: "value",
            type: "uint256",
          },
        ],
        name: "Approval",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "address",
            name: "from",
            type: "address",
          },
          {
            indexed: true,
            internalType: "address",
            name: "to",
            type: "address",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "value",
            type: "uint256",
          },
        ],
        name: "Transfer",
        type: "event",
      },
    ];

    const eventFinder = new EventFinder(abi);
    const events = eventFinder.findEvents();
    expect(events).toStrictEqual([
      {
        name: "Approval",
        inputs: [
          {
            name: "owner",
            type: "address",
            indexed: true,
          },
          {
            name: "spender",
            type: "address",
            indexed: true,
          },
          {
            name: "value",
            type: "uint256",
            indexed: false,
          },
        ],
      },
      {
        name: "Transfer",
        inputs: [
          {
            name: "from",
            type: "address",
            indexed: true,
          },
          {
            name: "to",
            type: "address",
            indexed: true,
          },
          {
            name: "value",
            type: "uint256",
            indexed: false,
          },
        ],
      },
    ]);
  });
});
