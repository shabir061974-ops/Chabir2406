// Customer bearer-token storage. Uses localStorage on web; on native (Capacitor) this
// module is the single place to swap in encrypted secure storage (Keychain / Keystore).
const ACCESS = "faiha_c_access";
const REFRESH = "faiha_c_refresh";

export const getToken = () => localStorage.getItem(ACCESS);
export const getRefreshToken = () => localStorage.getItem(REFRESH);

export const setTokens = (access, refresh) => {
    if (access) localStorage.setItem(ACCESS, access);
    if (refresh) localStorage.setItem(REFRESH, refresh);
};

export const setAccess = (access) => {
    if (access) localStorage.setItem(ACCESS, access);
};

export const clearTokens = () => {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
};
