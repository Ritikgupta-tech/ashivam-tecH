import crypto from "crypto";
import env from "../../../config/env.js";
import GoogleIntegration from "../models/googleIntegration.model.js";
import { encryptSecret, decryptSecret } from "./crypto.service.js";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_MEET_API_BASE = "https://meet.googleapis.com/v2";

/**
 * In-memory state cache for OAuth CSRF validation with 10-minute TTL.
 */
const oauthStateCache = new Map();

export const generateOAuthAuthUrl = () => {
  const state = crypto.randomBytes(24).toString("hex");
  oauthStateCache.set(state, Date.now() + 10 * 60 * 1000);

  // Clean expired states
  for (const [s, exp] of oauthStateCache.entries()) {
    if (exp < Date.now()) oauthStateCache.delete(s);
  }

  const scopes = env.googleOAuthScopes.join(" ");
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleRedirectUri,
    response_type: "code",
    scope: scopes,
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
  const integration = await GoogleIntegration.findOne({ serviceName: "google_meet" });
  if (!integration) {
    return {
      status: "DISCONNECTED",
      isConnected: false,
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
    tokenExpired: Boolean(isExpired),
    connectedAccountEmail: integration.connectedAccountEmail,
    lastSyncAt: integration.lastSyncAt,
    scopes: integration.scopes,
    lastError: integration.lastError,
  };
};
