import crypto from "crypto";
import env from "../../../config/env.js";
import GoogleIntegration from "../models/googleIntegration.model.js";
import { encryptSecret, decryptSecret } from "./crypto.service.js";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
const GOOGLE_MEET_API_BASE = "https://meet.googleapis.com/v2";
const WORKSPACE_EVENTS_API_BASE = "https://workspaceevents.googleapis.com/v1";

/**
 * In-memory state cache for OAuth CSRF validation with 10-minute TTL.
 */
const oauthStateCache = new Map();

export const generateOAuthAuthUrl = () => {
  const clientId = (env.googleClientId || "").trim();
  if (!clientId) {
    const error = new Error("Google Workspace OAuth client ID is not configured (missing GOOGLE_CLIENT_ID)");
    error.statusCode = 503;
    error.code = "GOOGLE_OAUTH_NOT_CONFIGURED";
    throw error;
  }

  const redirectUri = (env.googleRedirectUri || "").trim();
  if (!redirectUri) {
    const error = new Error("Google Workspace OAuth redirect URI is not configured (missing GOOGLE_REDIRECT_URI)");
    error.statusCode = 503;
    error.code = "GOOGLE_REDIRECT_URI_NOT_CONFIGURED";
    throw error;
  }

  try {
    const parsedUri = new URL(redirectUri);
    if (!["http:", "https:"].includes(parsedUri.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    const error = new Error("Google Workspace OAuth redirect URI is invalid. Must be an http or https URL.");
    error.statusCode = 503;
    error.code = "INVALID_GOOGLE_REDIRECT_URI";
    throw error;
  }

  const state = crypto.randomBytes(24).toString("hex");
  oauthStateCache.set(state, Date.now() + 10 * 60 * 1000);

  // Clean expired states
  for (const [s, exp] of oauthStateCache.entries()) {
    if (exp < Date.now()) oauthStateCache.delete(s);
  }

  const baseScopes = Array.isArray(env.googleOAuthScopes) ? env.googleOAuthScopes : [env.googleOAuthScopes];
  const combinedScopes = Array.from(new Set([
    ...baseScopes,
    "https://www.googleapis.com/auth/meetings.space.created",
    "https://www.googleapis.com/auth/meetings.space.readonly",
    "openid",
    "email",
  ])).filter(Boolean).join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: combinedScopes,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return {
    url: `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`,
    state,
  };
};

export const validateOAuthState = (state) => {
  if (!state || !oauthStateCache.has(state)) return false;
  const expiresAt = oauthStateCache.get(state);
  oauthStateCache.delete(state);
  return expiresAt > Date.now();
};

export const exchangeCodeForTokens = async (code) => {
  if (!code) throw new Error("Authorization code is required");

  const body = new URLSearchParams({
    code,
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    redirect_uri: env.googleRedirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const tokenData = await response.json();
  if (!response.ok) {
    const errorMsg = tokenData.error_description || tokenData.error || "Token exchange failed";
    throw new Error(`Google OAuth error: ${errorMsg}`);
  }

  // Encrypt refresh token
  const { encryptedText, iv, authTag } = encryptSecret(tokenData.refresh_token);
  const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

  let connectedAccountEmail = undefined;
  if (tokenData.id_token) {
    try {
      const payloadPart = tokenData.id_token.split(".")[1];
      const decoded = JSON.parse(Buffer.from(payloadPart, "base64").toString("utf8"));
      if (decoded.email) {
        connectedAccountEmail = String(decoded.email).toLowerCase().trim();
      }
    } catch {
      // non-fatal
    }
  }

  // Fallback to Google OpenID UserInfo if id_token did not yield email
  if (!connectedAccountEmail && tokenData.access_token) {
    try {
      const userinfoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userinfoRes.ok) {
        const userInfo = await userinfoRes.json();
        if (userInfo.email) {
          connectedAccountEmail = String(userInfo.email).toLowerCase().trim();
        }
      }
    } catch {
      // non-fatal
    }
  }

  // Save to GoogleIntegration record
  const integration = await GoogleIntegration.findOneAndUpdate(
    { serviceName: "google_meet" },
    {
      encryptedRefreshToken: encryptedText || undefined,
      iv: iv || undefined,
      authTag: authTag || undefined,
      accessToken: tokenData.access_token,
      tokenExpiresAt,
      scopes: tokenData.scope ? tokenData.scope.split(" ") : env.googleOAuthScopes,
      connectedAccountEmail: connectedAccountEmail || undefined,
      status: "CONNECTED",
      lastSyncAt: new Date(),
      lastError: null,
    },
    { upsert: true, returnDocument: "after" }
  );

  return integration;
};

/**
 * Returns a valid access token for Google API calls, refreshing automatically if necessary.
 */
export const getValidAccessToken = async () => {
  const integration = await GoogleIntegration.findOne({ serviceName: "google_meet" });
  if (!integration) {
    throw new Error("Google Meet integration is not connected. Re-authorization required.");
  }

  // Check if current access token is valid (with 5-minute safety buffer)
  if (
    integration.accessToken &&
    integration.tokenExpiresAt &&
    new Date(integration.tokenExpiresAt).getTime() - Date.now() > 5 * 60 * 1000
  ) {
    return integration.accessToken;
  }

  // Refresh token required
  if (!integration.encryptedRefreshToken) {
    integration.status = "REAUTH_REQUIRED";
    await integration.save();
    throw new Error("Google integration has no refresh token. Manual re-authorization required.");
  }

  const rawRefreshToken = decryptSecret({
    encryptedText: integration.encryptedRefreshToken,
    iv: integration.iv,
    authTag: integration.authTag,
  });

  if (!rawRefreshToken) {
    integration.status = "REAUTH_REQUIRED";
    await integration.save();
    throw new Error("Unable to decrypt Google refresh token. Re-authorization required.");
  }

  const body = new URLSearchParams({
    refresh_token: rawRefreshToken,
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const tokenData = await response.json();
  if (!response.ok) {
    integration.status = "REAUTH_REQUIRED";
    integration.lastError = tokenData.error_description || tokenData.error || "Failed to refresh token";
    await integration.save();
    throw new Error(`Google token refresh failed: ${integration.lastError}`);
  }

  integration.accessToken = tokenData.access_token;
  integration.tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);
  integration.status = "CONNECTED";
  integration.lastSyncAt = new Date();
  integration.lastError = null;

  if (tokenData.refresh_token) {
    const enc = encryptSecret(tokenData.refresh_token);
    integration.encryptedRefreshToken = enc.encryptedText;
    integration.iv = enc.iv;
    integration.authTag = enc.authTag;
  }

  await integration.save();
  return integration.accessToken;
};

/**
 * Creates a Google Meet Space via Google Meet REST API v2
 */
export const createMeetSpace = async (options = {}) => {
  const token = await getValidAccessToken();

  const response = await fetch(`${GOOGLE_MEET_API_BASE}/spaces`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options.spaceConfig || {}),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to create Google Meet space");
  }

  return {
    spaceName: data.name, // e.g. "spaces/AAAAAAAAAAAA"
    meetingUri: data.meetingUri, // e.g. "https://meet.google.com/xxx-yyyy-zzz"
    meetingCode: data.meetingCode, // e.g. "xxx-yyyy-zzz"
    config: data.config,
  };
};

/**
 * Retrieves space details from Google Meet REST API v2
 */
export const getMeetSpace = async (spaceName) => {
  const token = await getValidAccessToken();
  const cleanName = spaceName.startsWith("spaces/") ? spaceName : `spaces/${spaceName}`;

  const response = await fetch(`${GOOGLE_MEET_API_BASE}/${cleanName}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `Failed to fetch Google Meet space: ${cleanName}`);
  }

  return data;
};

/**
 * Lists conference records from Google Meet REST API v2 for a given space
 */
export const listConferenceRecords = async (spaceName, pageSize = 50) => {
  const token = await getValidAccessToken();
  const cleanSpace = spaceName.startsWith("spaces/") ? spaceName : `spaces/${spaceName}`;
  const filter = encodeURIComponent(`space.name="${cleanSpace}"`);

  const response = await fetch(
    `${GOOGLE_MEET_API_BASE}/conferenceRecords?pageSize=${pageSize}&filter=${filter}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to list conference records");
  }

  return data.conferenceRecords || [];
};

/**
 * Fetches all participants for a conference record
 */
export const listConferenceParticipants = async (conferenceRecordName) => {
  const token = await getValidAccessToken();
  const cleanName = conferenceRecordName.startsWith("conferenceRecords/")
    ? conferenceRecordName
    : `conferenceRecords/${conferenceRecordName}`;

  let allParticipants = [];
  let pageToken = "";

  do {
    const url = `${GOOGLE_MEET_API_BASE}/${cleanName}/participants?pageSize=100${
      pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""
    }`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to list conference participants");
    }

    if (Array.isArray(data.participants)) {
      allParticipants.push(...data.participants);
    }
    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return allParticipants;
};

/**
 * Fetches all participant sessions for a participant
 */
export const listParticipantSessions = async (participantName) => {
  const token = await getValidAccessToken();

  let allSessions = [];
  let pageToken = "";

  do {
    const url = `${GOOGLE_MEET_API_BASE}/${participantName}/participantSessions?pageSize=100${
      pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""
    }`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to list participant sessions");
    }

    if (Array.isArray(data.participantSessions)) {
      allSessions.push(...data.participantSessions);
    }
    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return allSessions;
};

/**
 * Inspects integration connection health
 */
export const getIntegrationHealth = async () => {
  const isConfigured = Boolean(env.isGoogleOAuthConfigured);
  const clientIdConfigured = Boolean(env.googleClientId);

  const integration = await GoogleIntegration.findOne({ serviceName: "google_meet" });
  if (!integration) {
    return {
      status: "DISCONNECTED",
      isConnected: false,
      isConfigured,
      clientIdConfigured,
      connectedAccountEmail: null,
      lastSyncAt: null,
      scopes: [],
      error: null,
    };
  }

  const isExpired = integration.tokenExpiresAt && new Date(integration.tokenExpiresAt) < new Date();

  return {
    status: integration.status,
    isConnected: integration.status === "CONNECTED",
    isConfigured,
    clientIdConfigured,
    tokenExpired: Boolean(isExpired),
    connectedAccountEmail: integration.connectedAccountEmail,
    lastSyncAt: integration.lastSyncAt,
    scopes: integration.scopes,
    lastError: integration.lastError,
  };
};

/**
 * Disconnects the Google Meet integration, revokes credentials with Google,
 * and resets integration status to DISCONNECTED.
 */
export const disconnectGoogleIntegration = async () => {
  const integration = await GoogleIntegration.findOne({ serviceName: "google_meet" });
  if (!integration) {
    return { success: true, status: "DISCONNECTED", message: "No active Google integration found" };
  }

  let tokenToRevoke = integration.accessToken;
  if (!tokenToRevoke && integration.encryptedRefreshToken) {
    try {
      tokenToRevoke = decryptSecret({
        encryptedText: integration.encryptedRefreshToken,
        iv: integration.iv,
        authTag: integration.authTag,
      });
    } catch {
      // non-fatal decryption issue during revocation
    }
  }

  if (tokenToRevoke) {
    try {
      await fetch(GOOGLE_REVOKE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: tokenToRevoke }).toString(),
      });
    } catch (revokeErr) {
      console.warn(`[Google OAuth Revocation Notice]: ${revokeErr.message}`);
    }
  }

  integration.status = "DISCONNECTED";
  integration.accessToken = null;
  integration.encryptedRefreshToken = null;
  integration.iv = null;
  integration.authTag = null;
  integration.tokenExpiresAt = null;
  integration.lastSyncAt = new Date();
  integration.lastError = null;
  await integration.save();

  return { success: true, status: "DISCONNECTED" };
};

/**
 * Creates a Workspace Events API subscription for a Google Meet space or conference record.
 */
export const createWorkspaceEventsSubscription = async ({ targetResource, eventTypes }) => {
  const token = await getValidAccessToken();
  const cleanTarget = targetResource.startsWith("//")
    ? targetResource
    : `//meet.googleapis.com/${targetResource.replace(/^\//, "")}`;

  const defaultEvents = [
    "google.workspace.meet.participant.v2.joined",
    "google.workspace.meet.participant.v2.left",
    "google.workspace.meet.conferenceRecord.v2.ended",
  ];

  const payload = {
    targetResource: cleanTarget,
    eventTypes: eventTypes || defaultEvents,
    notificationEndpoint: {
      pubsubTopic: env.googlePubSubTopic,
    },
    payloadOptions: {
      includeResource: true,
    },
  };

  const response = await fetch(`${WORKSPACE_EVENTS_API_BASE}/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to create Workspace Events subscription");
  }

  return data;
};

/**
 * Retrieves a Workspace Events subscription status.
 */
export const getWorkspaceEventsSubscription = async (subscriptionName) => {
  const token = await getValidAccessToken();
  const cleanName = subscriptionName.startsWith("subscriptions/")
    ? subscriptionName
    : `subscriptions/${subscriptionName}`;

  const response = await fetch(`${WORKSPACE_EVENTS_API_BASE}/${cleanName}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `Failed to fetch subscription: ${cleanName}`);
  }

  return data;
};

/**
 * Renews a Workspace Events subscription TTL.
 */
export const renewWorkspaceEventsSubscription = async (subscriptionName, ttlSeconds = 604800) => {
  const token = await getValidAccessToken();
  const cleanName = subscriptionName.startsWith("subscriptions/")
    ? subscriptionName
    : `subscriptions/${subscriptionName}`;

  const response = await fetch(`${WORKSPACE_EVENTS_API_BASE}/${cleanName}?updateMask=ttl`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ttl: `${ttlSeconds}s`,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `Failed to renew subscription: ${cleanName}`);
  }

  return data;
};

/**
 * Deletes a Workspace Events subscription.
 */
export const deleteWorkspaceEventsSubscription = async (subscriptionName) => {
  const token = await getValidAccessToken();
  const cleanName = subscriptionName.startsWith("subscriptions/")
    ? subscriptionName
    : `subscriptions/${subscriptionName}`;

  const response = await fetch(`${WORKSPACE_EVENTS_API_BASE}/${cleanName}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error?.message || `Failed to delete subscription: ${cleanName}`);
  }

  return { success: true };
};
