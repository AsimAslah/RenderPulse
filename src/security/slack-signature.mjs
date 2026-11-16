import { createHmac, timingSafeEqual } from "node:crypto";

const VERSION = "v0";

export function verifySlackRequest({
  rawBody,
  timestamp,
  signature,
  signingSecret,
  nowMs = Date.now(),
  toleranceSeconds = 300,
}) {
  if (typeof rawBody !== "string" && !Buffer.isBuffer(rawBody)) {
    return { ok: false, reason: "raw_body_required" };
  }
  if (!signingSecret || !timestamp || !signature) {
    return { ok: false, reason: "missing_signature_data" };
  }

  const requestSeconds = Number(timestamp);
  if (!Number.isSafeInteger(requestSeconds)) {
    return { ok: false, reason: "invalid_timestamp" };
  }
  const age = Math.abs(Math.floor(nowMs / 1000) - requestSeconds);
  if (age > toleranceSeconds) {
    return { ok: false, reason: "expired_timestamp" };
  }

  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");
  const expected = `${VERSION}=${createHmac("sha256", signingSecret)
    .update(Buffer.concat([Buffer.from(`${VERSION}:${timestamp}:`, "utf8"), body]))
    .digest("hex")}`;
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(String(signature), "utf8");
  if (expectedBuffer.length !== actualBuffer.length) {
    return { ok: false, reason: "invalid_signature" };
  }
  return timingSafeEqual(expectedBuffer, actualBuffer)
    ? { ok: true }
    : { ok: false, reason: "invalid_signature" };
}

