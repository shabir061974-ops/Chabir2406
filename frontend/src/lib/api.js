import axios from "axios";
import { getToken, getRefreshToken, setAccess, clearTokens } from "./authToken";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API, withCredentials: true });

// Attach the customer bearer token when present (admin continues to use its httpOnly cookie).
api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// On a 401 for a logged-in customer, transparently refresh the access token once and retry.
let _refreshing = null;
api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config || {};
        const rt = getRefreshToken();
        const url = String(original.url || "");
        if (error.response?.status === 401 && rt && !original._retry && !url.includes("/customer/refresh")) {
            original._retry = true;
            try {
                _refreshing = _refreshing || api.post("/customer/refresh", { refresh_token: rt });
                const { data } = await _refreshing;
                _refreshing = null;
                setAccess(data.access_token);
                original.headers = { ...original.headers, Authorization: `Bearer ${data.access_token}` };
                return api(original);
            } catch (e) {
                _refreshing = null;
                clearTokens();
            }
        }
        return Promise.reject(error);
    }
);

export function formatApiError(detail) {
    if (detail == null) return "Something went wrong. Please try again.";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail))
        return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
    if (detail && typeof detail.msg === "string") return detail.msg;
    if (detail && typeof detail.message === "string") return detail.message;
    return JSON.stringify(detail);
}

export default api;
