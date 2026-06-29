import { vi } from "vitest";

export type SpyObj<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? ReturnType<typeof vi.fn<(...args: A) => R>>
    : T[K];
};

export function createSpyObj<T extends Record<string, unknown>>(
  _name: string,
  methods: (keyof T)[]
): SpyObj<T> {
  const obj = {} as SpyObj<T>;
  for (const method of methods) {
    obj[method] = vi.fn() as any;
  }
  return obj;
}
