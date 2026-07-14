import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { getToken, setTokens, clearTokens } from "@/lib/authToken";

const CustomerAuthContext = createContext(null);

// Customer (storefront/app) accounts — phone + password, bearer tokens.
// Kept fully separate from the admin AuthContext (which uses httpOnly cookies).
export function CustomerAuthProvider({ children }) {
    const [customer, setCustomer] = useState(null); // null = loading, false = signed out, object = signed in

    const loadMe = useCallback(async () => {
        if (!getToken()) { setCustomer(false); return; }
        try {
            const { data } = await api.get("/customer/me");
            setCustomer(data);
        } catch {
            clearTokens();
            setCustomer(false);
        }
    }, []);

    useEffect(() => { loadMe(); }, [loadMe]);

    const register = useCallback(async (phone, password, name) => {
        const { data } = await api.post("/customer/register", { phone, password, name });
        setTokens(data.access_token, data.refresh_token);
        setCustomer(data.customer);
        return data.customer;
    }, []);

    const login = useCallback(async (phone, password) => {
        const { data } = await api.post("/customer/login", { phone, password });
        setTokens(data.access_token, data.refresh_token);
        setCustomer(data.customer);
        return data.customer;
    }, []);

    const logout = useCallback(() => { clearTokens(); setCustomer(false); }, []);

    const updateProfile = useCallback(async (payload) => {
        const { data } = await api.put("/customer/profile", payload);
        setCustomer(data);
        return data;
    }, []);

    return (
        <CustomerAuthContext.Provider value={{ customer, register, login, logout, updateProfile, reload: loadMe }}>
            {children}
        </CustomerAuthContext.Provider>
    );
}

export const useCustomer = () => useContext(CustomerAuthContext);
