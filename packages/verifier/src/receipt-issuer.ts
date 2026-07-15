import { createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256, type ProofReceipt } from "@burhan/core";
import { verifyEvidenceChain } from "./evidence-chain.js";

type UnsignedReceipt = Omit<ProofReceipt, "signature">;

export async function issueReceipt(receiptPath: string, receipt: UnsignedReceipt): Promise<ProofReceipt> {
  const keys = generateKeyPairSync("ed25519");
  const payload = Buffer.from(canonicalJson(receipt));
  const signed: ProofReceipt = {
    ...receipt,
    signature: {
      algorithm: "Ed25519",
      publicKey: keys.publicKey.export({ type: "spki", format: "pem" }).toString(),
      value: sign(null, payload, keys.privateKey).toString("base64"),
    },
  };
  await mkdir(receiptPath, { recursive: true });
  await writeFile(path.join(receiptPath, "receipt.json"), `${canonicalJson(signed)}\n`);
  return signed;
}

export async function verifyReceipt(receiptFile: string): Promise<boolean> {
  const receipt = JSON.parse(await readFile(receiptFile, "utf8")) as ProofReceipt;
  const { signature, ...unsigned } = receipt;
  return verify(null, Buffer.from(canonicalJson(unsigned)), createPublicKey(signature.publicKey), Buffer.from(signature.value, "base64"));
}

export async function verifyReceiptWithEvidence(receiptFile: string, evidencePath: string): Promise<boolean> {
  if (!await verifyReceipt(receiptFile)) return false;
  const receipt = JSON.parse(await readFile(receiptFile, "utf8")) as ProofReceipt;
  const chain = await verifyEvidenceChain(evidencePath);
  return chain.valid && chain.rootHash === receipt.eventLogRootHash;
}

export function evidenceRoot(records: EvidenceRecordLike[]): string {
  return records.length === 0 ? sha256("") : records.at(-1)!.evidenceHash;
}

type EvidenceRecordLike = { evidenceHash: string };
