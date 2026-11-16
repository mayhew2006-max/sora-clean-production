import "server-only";
import { createHash, createSign } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const PACKAGE_NAME = "com.graceai.assistant";
const PRODUCT_ID = "grace_premium_monthly";
const ACTIVE_STATES = new Set([
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_CANCELED", // Paid through current expiry, not renewing.
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
]);

type PlayReceipt = {
  subscriptionState?: string;
  acknowledgementState?: string;
  externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string };
  lineItems?: Array<{ productId?: string; expiryTime?: string }>;
};

type GoogleServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};
let cachedAccessToken: { value: string; expires: number } | null = null;

export function obfuscatedGraceId(userId: string) {
  return createHash("sha256").update(userId, "utf8").digest("hex");
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

async function googleAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expires > Date.now() + 120_000) {
    return cachedAccessToken.value;
  }
  const json = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error("Google Play server credentials are not configured");
  let credentials: GoogleServiceAccount;
  try {
    credentials = JSON.parse(json) as GoogleServiceAccount;
  } catch {
    throw new Error("Google Play credentials must be valid JSON");
  }
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error("Google Play service account is incomplete");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({
    iss: credentials.client_email,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/androidpublisher",
    iat: now,
    exp: now + 3600,
  }));
  const signedPart = header + "." + claims;
  const signer = createSign("RSA-SHA256");
  signer.update(signedPart);
  signer.end();
  const assertion = signedPart + "." + signer.sign(credentials.private_key).toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    // OAuth error descriptions may contain private identifiers. Log only allowlisted categories,
    // never the JWT, service-account key, or Google's raw error response.
    const oauthError = (await res.json().catch(() => ({}))) as {
      error?: unknown;
      error_description?: unknown;
    };
    const code = typeof oauthError.error === "string" ? oauthError.error : "";
    const description = typeof oauthError.error_description === "string" ? oauthError.error_description : "";
    const safeCode = ["invalid_grant", "invalid_client", "invalid_scope", "unauthorized_client"].includes(code)
      ? code : "unclassified";
    const safeReason = /invalid jwt signature/i.test(description) ? "invalid-jwt-signature"
      : /disabled|deleted/i.test(description) ? "disabled-or-deleted-account"
      : /account not found|not a valid email|invalid email|unknown service account/i.test(description)
        ? "unrecognized-service-account"
      : /invalid jwt|invalid assertion|jwt must/i.test(description) ? "invalid-jwt-claims"
      : /key/i.test(description) ? "key-validation-failed"
      : "unclassified";
    throw new Error("Unable to authorize Google Play verification (" + res.status
      + "; " + safeCode + "; " + safeReason + ")");
  }
  const body = await res.json() as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error("No Google access token returned");
  cachedAccessToken = {
    value: body.access_token,
    expires: Date.now() + Math.min(body.expires_in || 3500, 3500) * 1000,
  };
  return body.access_token;
}

async function getReceipt(token: string, access: string): Promise<PlayReceipt> {
  const endpoint = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/"
    + PACKAGE_NAME + "/purchases/subscriptionsv2/tokens/" + encodeURIComponent(token);
  const response = await fetch(endpoint, {
    headers: { Authorization: "Bearer " + access },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Google Play receipt check failed (" + response.status + ")");
  return (await response.json()) as PlayReceipt;
}

async function acknowledgePurchase(token: string, access: string) {
  const endpoint = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/"
    + PACKAGE_NAME + "/purchases/subscriptions/" + PRODUCT_ID
    + "/tokens/" + encodeURIComponent(token) + ":acknowledge";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + access,
      "Content-Type": "application/json",
    },
    body: "{}",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Google Play purchase acknowledgement failed (" + response.status + ")");
}

/** Never grant access based on a token sent from Android without Google verification. */
export async function verifyGracePlayPurchase(userId: string, purchaseToken: string) {
  if (!purchaseToken || purchaseToken.length > 4096) throw new Error("Invalid purchase token");

  const { data: assigned, error: assignedError } = await supabaseAdmin
    .from("grace_play_subscriptions")
    .select("user_id")
    .eq("purchase_token", purchaseToken)
    .maybeSingle();
  if (assignedError) throw assignedError;
  if (assigned && assigned.user_id !== userId) throw new Error("Purchase belongs to another account");

  const access = await googleAccessToken();
  const receipt = await getReceipt(purchaseToken, access);
  const matched = (receipt.lineItems || []).filter((x) => x.productId === PRODUCT_ID);
  if (matched.length === 0) throw new Error("Purchase is not for Grace Field Premium");

  const linkedAccount = receipt.externalAccountIdentifiers?.obfuscatedExternalAccountId;
  if (linkedAccount !== obfuscatedGraceId(userId)) {
    throw new Error("The Google Play purchase belongs to a different Grace account");
  }

  const expiry = Math.max(...matched.map((x) => Date.parse(x.expiryTime || "")));
  if (!Number.isFinite(expiry)) throw new Error("Google Play expiry date is invalid");
  const state = receipt.subscriptionState || "SUBSCRIPTION_STATE_UNSPECIFIED";
  const active = ACTIVE_STATES.has(state) && expiry > Date.now();

  // Google can refund unacknowledged purchases. Acknowledge before granting access.
  if (active && receipt.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING") {
    await acknowledgePurchase(purchaseToken, access);
  }

  const { error: saveError } = await supabaseAdmin.rpc("grace_sync_play_entitlement", {
    p_user_id: userId,
    p_purchase_token: purchaseToken,
    p_product_id: PRODUCT_ID,
    p_state: state,
    p_expires_at: new Date(expiry).toISOString(),
    p_active: active,
  });
  if (saveError) throw saveError;
  return { active, state, expiresAt: new Date(expiry).toISOString() };
}

/** Cached briefly to limit API traffic. Refresh when app is used, expired, or account is viewed. */
export async function refreshGracePlay(userId: string, force = false) {
  const { data: current, error } = await supabaseAdmin
    .from("grace_play_subscriptions")
    .select("purchase_token,last_checked_at,expires_at,subscription_state")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!current) return { active: false, source: "none" };
  const checked = Date.parse(current.last_checked_at || "") || 0;
  const expiry = Date.parse(current.expires_at || "") || 0;
  if (!force && Date.now() - checked < 15 * 60_000 && expiry > Date.now()) {
    return { active: ACTIVE_STATES.has(current.subscription_state), source: "cached" };
  }
  return { ...(await verifyGracePlayPurchase(userId, current.purchase_token)), source: "google" };
}

/** Founder-only diagnostic endpoint calls this; no purchase token or credential is returned. */
export async function checkGracePlayServerAuthorization(): Promise<void> {
  await googleAccessToken();
}
