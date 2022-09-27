import { describe, expect, test } from '@jest/globals';
import { Random } from "../src/random";

describe('random secret', () => {
  test('secret 16', () => {
    const s = Random.secret(16)
    expect(s).toHaveLength(16);
  });
  test('secret 32', () => {
    const s = Random.secret(32)
    expect(s).toHaveLength(32);
  });
});

describe('random secret', () => {
  test('hexString 16', () => {
    const s = Random.hexString(16)
    expect(s).toHaveLength(16);
  });
  test('hexString 32', () => {
    const s = Random.hexString(32)
    expect(s).toHaveLength(32);
  });
});
