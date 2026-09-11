import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { User, LogOut, Package, Loader2, Plus, X } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useCustomer } from "@/context/CustomerAuthContext";
import { useLang } from "@/context/LanguageContext";
import { formatKD } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Account() {
    const { customer, login, register, logout } = useCustomer();
    const { t } = useLang();

    if (customer === null) {
        return <div className="grid place-items-center py-32"><Loader2 className="w-6 h-6 animate-spin text-forest" /></div>;
    }
    return (
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10" data-testid="account-page">
            {customer ? <Dashboard customer={customer} logout={logout} t={t} /> : <AuthForms login={login} register={register} t={t} />}
        </div>
    );
}

/* ---------------- Signed-out: login / register ---------------- */
function AuthForms({ login, register, t }) {
    const [mode, setMode] = useState("login");
    const [form, setForm] = useState({ phone: "", password: "", name: "" });
    const [busy, setBusy] = useState(false);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.phone.trim() || !form.password) return;
        if (mode === "register" && form.password.length < 6) { toast.error(t("min_password")); return; }
        setBusy(true);
        try {
            if (mode === "register") { await register(form.phone.trim(), form.password, form.name.trim()); toast.success(t("account_created")); }
            else { await login(form.phone.trim(), form.password); toast.success(t("welcome_back")); }
        } catch (err) {
            toast.error(formatApiError(err.response?.data?.detail));
        } finally { setBusy(false); }
    };

    return (
        <div className="rounded-2xl bg-white border border-border p-6 sm:p-8 max-w-md mx-auto">
            <div className="grid place-items-center w-12 h-12 rounded-full bg-forest/10 text-forest mx-auto mb-3"><User className="w-6 h-6" /></div>
            <h1 className="font-heading font-bold text-2xl text-center">{mode === "login" ? t("sign_in") : t("create_account")}</h1>
            <p className="text-sm text-muted-foreground text-center mt-1 mb-6">{t("account_subtitle")}</p>

            <form onSubmit={submit} className="space-y-4">
                {mode === "register" && (
                    <Field label={t("full_name")}><Input data-testid="acc-name" value={form.name} onChange={set("name")} required /></Field>
                )}
                <Field label={t("phone")}><Input data-testid="acc-phone" type="tel" inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="9XXXXXXX" required /></Field>
                <Field label={t("password")}><Input data-testid="acc-password" type="password" value={form.password} onChange={set("password")} required /></Field>
                <Button type="submit" disabled={busy} data-testid="acc-submit" className="w-full h-11 rounded-full bg-forest hover:bg-forest-dark text-white font-semibold">
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === "login" ? t("login_btn") : t("register_btn"))}
                </Button>
            </form>

            <p className="text-sm text-center text-muted-foreground mt-5">
                {mode === "login" ? t("new_customer") : t("have_account")}{" "}
                <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="font-semibold text-forest hover:text-terracotta" data-testid="acc-toggle">
                    {mode === "login" ? t("create_account") : t("sign_in")}
                </button>
            </p>
        </div>
    );
}

/* ---------------- Signed-in: profile + orders ---------------- */
function Dashboard({ customer, logout, t }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="grid place-items-center w-11 h-11 rounded-full bg-forest/10 text-forest shrink-0"><User className="w-5 h-5" /></div>
                    <div className="min-w-0">
                        <h1 className="font-heading font-bold text-xl truncate">{customer.name || t("my_account")}</h1>
                        <p className="text-sm text-muted-foreground">{customer.phone}</p>
                    </div>
                </div>
                <Button variant="outline" onClick={logout} data-testid="acc-logout" className="rounded-full gap-1.5 shrink-0"><LogOut className="w-4 h-4" /> {t("logout")}</Button>
            </div>

            <ProfileCard customer={customer} t={t} />
            <OrdersCard t={t} />
        </div>
    );
}

function ProfileCard({ customer, t }) {
    const { updateProfile } = useCustomer();
    const [name, setName] = useState(customer.name || "");
    const [email, setEmail] = useState(customer.email || "");
    const [addresses, setAddresses] = useState(customer.addresses?.length ? customer.addresses : [""]);
    const [busy, setBusy] = useState(false);

    const save = async () => {
        setBusy(true);
        try {
            await updateProfile({ name, email, addresses: addresses.map((a) => a.trim()).filter(Boolean) });
            toast.success(t("saved"));
        } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
        finally { setBusy(false); }
    };

    return (
        <section className="rounded-2xl bg-white border border-border p-6">
            <h2 className="font-heading font-semibold text-lg mb-4">{t("profile")}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
                <Field label={t("full_name")}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
                <Field label={t("email")}><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            </div>
            <div className="mt-4">
                <Label className="text-sm mb-1.5 block">{t("saved_addresses")}</Label>
                <div className="space-y-2">
                    {addresses.map((a, i) => (
                        <div key={i} className="flex gap-2">
                            <Input value={a} onChange={(e) => setAddresses((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))} placeholder={t("address")} />
                            {addresses.length > 1 && <button type="button" onClick={() => setAddresses((arr) => arr.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive px-1"><X className="w-4 h-4" /></button>}
                        </div>
                    ))}
                </div>
                <button type="button" onClick={() => setAddresses((arr) => [...arr, ""])} className="mt-2 inline-flex items-center gap-1 text-sm text-forest hover:text-terracotta"><Plus className="w-4 h-4" /> {t("add_address")}</button>
            </div>
            <Button onClick={save} disabled={busy} className="mt-5 rounded-full bg-forest hover:bg-forest-dark text-white">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t("save_changes")}</Button>
        </section>
    );
}

function OrdersCard({ t }) {
    const { data: orders = [], isLoading } = useQuery({ queryKey: ["customer-orders"], queryFn: async () => (await api.get("/customer/orders")).data });

    return (
        <section className="rounded-2xl bg-white border border-border p-6" data-testid="account-orders">
            <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-forest" /> {t("order_history")}</h2>
            {isLoading ? (
                <div className="py-8 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-forest" /></div>
            ) : orders.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                    <p>{t("no_orders")}</p>
                    <Link to="/products"><Button className="mt-4 rounded-full bg-forest hover:bg-forest-dark text-white">{t("continue_shopping")}</Button></Link>
                </div>
            ) : (
                <div className="divide-y divide-border">
                    {orders.map((o) => (
                        <Link to={`/order/${o.order_no}`} key={o.order_no} className="flex items-center justify-between gap-3 py-3 hover:bg-secondary/40 -mx-2 px-2 rounded-lg transition-colors">
                            <div className="min-w-0">
                                <p className="font-mono text-sm font-semibold">{o.order_no}</p>
                                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()} · {(o.items || []).length} {t("items")}</p>
                            </div>
                            <div className="text-end shrink-0">
                                <p className="font-semibold">{formatKD(o.net_payable)}</p>
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{o.order_status}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}

const Field = ({ label, children }) => (
    <div><Label className="text-sm mb-1.5 block">{label}</Label>{children}</div>
);
