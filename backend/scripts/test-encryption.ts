import * as assert from "assert";
import * as crypto from "crypto";

async function runTests() {
  // Set mock environment variables in process.env so that env.ts loads successfully
  const mockKey = crypto.randomBytes(32).toString("hex");
  process.env.ENCRYPTION_KEY = mockKey; // 32 bytes (64 hex characters)
  process.env.JWT_ACCESS_SECRET = mockKey;
  process.env.JWT_REFRESH_SECRET = mockKey;
  process.env.CLIENT_URL = "http://localhost:3000";
  process.env.MONGO_URI = "mongodb://localhost:27017/test";
  process.env.COOKIE_SECRET = mockKey;

  console.log("Loading encryption service...");
  // Use dynamic import to prevent TS compilation import hoisting
  const { encrypt, decrypt } = await import("../src/services/encryption.service");

  console.log("Running encryption service tests...");

  // Test 1: Happy paths
  const cases = [
    "Hello World",
    "",
    "🚀 Unicode test with symbols and Emojis! 💉🩸🧬",
    "A".repeat(10000), // long text
  ];

  for (const plaintext of cases) {
    const ciphertext = encrypt(plaintext);
    assert.ok(ciphertext, "Ciphertext should not be empty");
    assert.notStrictEqual(ciphertext, plaintext, "Ciphertext should not be equal to plaintext");

    const decrypted = decrypt(ciphertext);
    assert.strictEqual(decrypted, plaintext, `Decrypted text should match original for: "${plaintext.substring(0, 20)}..."`);
  }
  console.log("✓ Happy paths passed");

  // Test 2: Randomized IV
  const plain = "Same Plaintext";
  const cipher1 = encrypt(plain);
  const cipher2 = encrypt(plain);
  assert.notStrictEqual(cipher1, cipher2, "Two encryptions of the same text must produce different ciphertexts (randomized IV)");
  assert.strictEqual(decrypt(cipher1), plain);
  assert.strictEqual(decrypt(cipher2), plain);
  console.log("✓ Randomized IV passed");

  // Test 3: Tamper detection / Integrity
  const originalCipher = encrypt("Sensitive Data");

  // Tampering with ciphertext part
  const parts = originalCipher.split(":");
  const ivHex = parts[0];
  const authTagHex = parts[1];
  const cipherTextHex = parts[2];

  // Corrupt the last character of the ciphertext hex
  const corruptedCipherTextHex = cipherTextHex.substring(0, cipherTextHex.length - 1) +
    (cipherTextHex.slice(-1) === "0" ? "1" : "0");
  const tamperedCipher = `${ivHex}:${authTagHex}:${corruptedCipherTextHex}`;

  assert.throws(() => {
    decrypt(tamperedCipher);
  }, /Unsupported state or unable to authenticate data/i, "Should throw an authentication error when ciphertext is tampered with");

  // Corrupt the IV
  const corruptedIvHex = ivHex.substring(0, ivHex.length - 1) +
    (ivHex.slice(-1) === "0" ? "1" : "0");
  const tamperedIv = `${corruptedIvHex}:${authTagHex}:${cipherTextHex}`;

  assert.throws(() => {
    decrypt(tamperedIv);
  }, /Unsupported state or unable to authenticate data/i, "Should throw an authentication error when IV is tampered with");

  // Corrupt the Auth Tag
  const corruptedAuthTagHex = authTagHex.substring(0, authTagHex.length - 1) +
    (authTagHex.slice(-1) === "0" ? "1" : "0");
  const tamperedAuthTag = `${ivHex}:${corruptedAuthTagHex}:${cipherTextHex}`;

  assert.throws(() => {
    decrypt(tamperedAuthTag);
  }, /Unsupported state or unable to authenticate data/i, "Should throw an authentication error when Auth Tag is tampered with");

  console.log("✓ Tamper detection passed");
  console.log("All tests completed successfully!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
