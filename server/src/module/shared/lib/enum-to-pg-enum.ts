/* eslint-disable @typescript-eslint/no-unsafe-return */
export const enumToPgEnum = <T extends Record<string, any>>(
  myEnum: T,
): [T[keyof T], ...T[keyof T][]] =>
  Object.values(myEnum).map((value: any) => `${value}`) as any;
