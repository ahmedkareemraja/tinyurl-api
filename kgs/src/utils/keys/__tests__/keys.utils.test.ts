import KeysUtils from '..';

describe('KeysUtils.generateRandomKey', () => {
  it('defaults to a 7-character key made only of url-safe alphanumeric characters', () => {
    const key = KeysUtils.generateRandomKey();

    expect(key).toHaveLength(7);
    expect(key).toMatch(/^[0-9A-Za-z]+$/);
  });

  it('honors a custom length', () => {
    expect(KeysUtils.generateRandomKey(10)).toHaveLength(10);
  });

  it('practically never collides across a large sample, keeping generated keys unique', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 5000; i++) {
      keys.add(KeysUtils.generateRandomKey());
    }

    expect(keys.size).toBe(5000);
  });
});
