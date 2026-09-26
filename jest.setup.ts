// expo-crypto's UUID comes from a native module that isn't present under Jest.
jest.mock('expo-crypto', () => ({ randomUUID: () => globalThis.crypto.randomUUID() }));
