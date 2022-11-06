export class ABIMerger {
  abis: any[];

  constructor(abis: any[]) {
    this.abis = abis;
  }

  /**
   * Merge multiple ABI files into one
   * @returns {any[]} merged abi
   */
  merge(): any {
    let mergedABI: any[] = [];
    for (let abi of this.abis) {
      mergedABI = mergedABI.concat(abi);
    }
    return this.uniqueByName(mergedABI);
  }

  /**
   * Get unique array item by name
   */
  uniqueByName(abi: any[]): any[] {
    const unique: any[] = [];
    const names: string[] = [];
    for (let item of abi) {
      if (names.indexOf(item.name) === -1) {
        unique.push(item);
        names.push(item.name);
      }
    }
    return unique;
  }
}
