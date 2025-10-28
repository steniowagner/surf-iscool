export const enumToPgEnum = <T extends Record<string, any>>(
  myEnum: T,
): [T[keyof T], ...T[keyof T][]] =>
  Object.values(myEnum).map((value: any) => `${value}`) as [
    T[keyof T],
    ...T[keyof T][],
  ];
