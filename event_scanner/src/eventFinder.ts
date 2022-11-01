export class EventFinder {
  abi: any;
  constructor(abi: any) {
    this.abi = abi;
  }

  findEvents(): string[] {
    const events: string[] = [];
    for (const item of this.abi) {
      if (item.type === "event") {
        events.push(item.name);
      }
    }
    return events;
  }
}
