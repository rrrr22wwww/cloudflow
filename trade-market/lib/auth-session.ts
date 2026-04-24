export const AUTH_EVENT = "cloudflow-auth-updated";
export const TOKEN_KEY = "trade_market_cloudflow_token";
export const USER_KEY = "trade_market_cloudflow_user";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  img_user?: string | null;
  role?: string | null;
};

export type StoredSession = {
  token: string;
  user: SessionUser | null;
};

function safeParseUser(value: string | null): SessionUser | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as SessionUser;
  } catch {
    return null;
  }
}

export function getStoredSession(): StoredSession {
  if (typeof window === "undefined") {
    return { token: "", user: null };
  }

  return {
    token: window.localStorage.getItem(TOKEN_KEY) ?? "",
    user: safeParseUser(window.localStorage.getItem(USER_KEY)),
  };
}

export function saveStoredSession(session: StoredSession) {
  window.localStorage.setItem(TOKEN_KEY, session.token);

  if (session.user) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  } else {
    window.localStorage.removeItem(USER_KEY);
  }

  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

export function clearStoredSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}
