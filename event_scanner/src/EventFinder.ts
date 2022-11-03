export interface FoundEvent {
  name: string;
  inputs: {
    name: string;
    type: string;
    indexed: boolean;
  }[];
}

export class EventFinder {
  abi: any;
  constructor(abi: any) {
    this.abi = abi;
  }

  findEvents(): FoundEvent[] {
    const events: FoundEvent[] = [];
    if (this.abi === undefined) {
      return events;
    }
    for (const item of this.abi) {
      if (item.type === "event") {
        events.push({
          name: item.name,
          inputs: item.inputs.map((input: any) => ({
            name: input.name,
            type: input.type,
            indexed: input.indexed,
          })),
        });
      }
    }
    return events;
  }
}
