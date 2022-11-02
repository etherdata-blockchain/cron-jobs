import logger from "node-color-log";

export class Slicer {
  batchSize: number;

  constructor(batchSize: number = 1000) {
    this.batchSize = batchSize;
    logger.info(`Batch size: ${this.batchSize}`);
  }

  /**
   * Given a start, end and a callback function, will slice the range into batches of size batchSize.
   * For each batch, the callback function will be called with the batch start and end.
   */
  async slice(
    start: number,
    end: number,
    callback: (start: number, end: number) => Promise<void>
  ): Promise<void> {
    const batches = this.getBatches(start, end);
    for (const batch of batches) {
      await callback(batch.start, batch.end);
    }
  }

  getBatches(start: number, end: number): { start: number; end: number }[] {
    const batches: { start: number; end: number }[] = [];
    for (let i = start; i < end; i += this.batchSize) {
      batches.push({
        start: i,
        end: Math.min(i + this.batchSize, end),
      });
    }
    return batches;
  }
}
