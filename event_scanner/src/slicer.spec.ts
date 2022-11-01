import { Slicer } from "./slicer";

describe("Given a Slicer", () => {
  it("should slice a range into batches", () => {
    const slicer = new Slicer(2);
    const batches = slicer.getBatches(0, 5);
    expect(batches).toEqual([
      { start: 0, end: 2 },
      { start: 2, end: 4 },
      { start: 4, end: 5 },
    ]);
  });

  it("should slice a range into batches", async () => {
    const slicer = new Slicer(2);
    const batches = slicer.getBatches(0, 5);
    expect(batches).toEqual([
      { start: 0, end: 2 },
      { start: 2, end: 4 },
      { start: 4, end: 5 },
    ]);
  });

  it("Should run the callback for each batch", async () => {
    const slicer = new Slicer(2);
    const callback = jest.fn();
    await slicer.slice(0, 5, callback);
    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenCalledWith(0, 2);
    expect(callback).toHaveBeenCalledWith(2, 4);
    expect(callback).toHaveBeenCalledWith(4, 5);
  });
});
