import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLogin() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("admin@faiha.coop");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => { if (user) navigate("/admin/dashboard"); }, [user, navigate]);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(email, password);
            navigate("/admin/dashboard");
        } catch (err) {
            setError(formatApiError(err.response?.data?.detail) || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid place-items-center bg-[#F4F5F7] px-4" data-testid="admin-login-page">
            <div className="w-full max-w-sm">
                <div className="flex items-center justify-center gap-2 mb-6">
                    <img src="/faiha-logo.png" alt="Faiha" className="w-11 h-11 rounded-full object-cover" />
                    <span className="font-heading font-extrabold text-xl text-forest">Faiha Admin</span>
                </div>
                <form onSubmit={submit} className="rounded-2xl bg-white border border-border p-7 space-y-4 shadow-sm">
                    <h1 className="font-heading font-bold text-2xl flex items-center gap-2"><Lock className="w-5 h-5 text-forest" /> {/* */}Login</h1>
                    <div>
                        <Label className="text-sm mb-1.5 block">Email</Label>
                        <Input data-testid="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div>
                        <Label className="text-sm mb-1.5 block">Password</Label>
                        <Input data-testid="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    {error && <p className="text-sm text-destructive" data-testid="admin-login-error">{error}</p>}
                    <Button type="submit" disabled={loading} data-testid="admin-login-submit" className="w-full h-11 rounded-full bg-forest hover:bg-forest-dark font-semibold">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
