export class MyUtils {
  /** NOTE: this method assumes the list contains unique elements. In case of collision, it just gives (index + 1) % len */
  static sampleUnique<T>(list: T[], cur: T): T {
    let randIndex = Math.floor(Math.random() * list.length);
    return (list[randIndex] !== cur)
      ? list[randIndex]
      : list[(randIndex + 1) % list.length];
  }
}