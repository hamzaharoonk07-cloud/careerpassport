import axios from 'axios';

/**
 * Single axios instance for the whole app.
 * `withCredentials` is on so the httpOnly auth cookies travel with every call.
 * In dev, Vite proxies /api to the Express server, keeping it same-origin.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/** Endpoints that must never trigger a refresh — refreshing them is circular. */
const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

/**
 * Silent token refresh.
 *
 * The access token lives fifteen minutes. Without this, a user reading a
 * career page for a quarter of an hour would be quietly signed out on their
 * next click. On a 401 we call /auth/refresh once and replay the original
 * request; if the refresh itself fails, the session really is over.
 *
 * `pending` collapses a burst of simultaneous 401s into one refresh call —
 * a dashboard firing three requests at once must not fire three refreshes.
 */
let pending = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;

    if (
      response?.status !== 401 ||
      !config ||
      config._retried ||
      NO_REFRESH.some((path) => config.url?.includes(path))
    ) {
      return Promise.reject(error);
    }

    config._retried = true;

    try {
      pending = pending || api.post('/auth/refresh');
      await pending;
      return api(config);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    } finally {
      pending = null;
    }
  }
);

/** Unwraps the API's error shape into a plain message components can render. */
export function apiError(err) {
  return (
    err?.response?.data?.message ||
    err?.message ||
    'Something went wrong. Please try again.'
  );
}
