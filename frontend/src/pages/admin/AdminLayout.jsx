import { NavLink, Outlet, useNavigate, Navigate } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Package, Tags, Ticket, Truck, Users, BarChart3, LogOut, Store, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/admin/NotificationBell";

const NAV = [
    { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/orders", icon: ShoppingCart, label: "Orders" },
    { to: "/admin/products", icon: Package, label: "Products" },
    { to: "/admin/categories", icon: Tags, label: "Categories" },
    { to: "/admin/addons", icon: Sparkles, label: "Add-ons" },
    { to: "/admin/coupons", icon: Ticket, label: "Coupons" },
    { to: "/admin/delivery", icon: Truck, label: "Delivery" },
    { to: "/admin/customers", icon: Users, label: "Customers" },
    { to: "/admin/reports", icon: BarChart3, label: "Reports" },
];

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    if (user === null) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
    if (user === false) return <Navigate to="/admin/login" replace />;

    const doLogout = async () => { await logout(); navigate("/admin/login"); };

    return (
        <div className="min-h-screen bg-[#F4F5F7] flex" data-testid="admin-layout">
            <aside className="hidden md:flex w-60 flex-col bg-forest text-white fixed inset-y-0 start-0">
                <div className="flex items-center gap-2 px-5 h-16 border-b border-white/10">
                    <img src="/faiha-logo.png" alt="Faiha" className="w-9 h-9 rounded-full object-cover bg-white" />
                    <span className="font-heading font-bold">Faiha Admin</span>
                </div>
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {NAV.map((n) => (
                        <NavLink key={n.to} to={n.to} data-testid={`admin-nav-${n.label.toLowerCase()}`}
                            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
                            <n.icon className="w-4.5 h-4.5" /> {n.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="p-3 border-t border-white/10 space-y-1">
                    <NavLink to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10"><Store className="w-4 h-4" /> View Store</NavLink>
                    <button onClick={doLogout} data-testid="admin-logout" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10"><LogOut className="w-4 h-4" /> Logout</button>
                </div>
            </aside>

            <div className="flex-1 md:ms-60 min-w-0">
                {/* desktop top bar with notifications */}
                <div className="hidden md:flex items-center justify-between bg-white border-b border-border px-6 h-16">
                    <div />
                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <Button size="sm" variant="ghost" onClick={doLogout}><LogOut className="w-4 h-4" /></Button>
                    </div>
                </div>
                {/* mobile top bar */}
                <div className="md:hidden flex items-center justify-between bg-forest text-white px-4 h-14">
                    <span className="font-heading font-bold">Faiha Admin</span>
                    <div className="flex items-center gap-2">
                        <NotificationBell />
                        <Button size="sm" variant="ghost" onClick={doLogout} className="text-white"><LogOut className="w-4 h-4" /></Button>
                    </div>
                </div>
                <div className="md:hidden flex gap-1 overflow-x-auto px-2 py-2 bg-white border-b border-border">
                    {NAV.map((n) => (
                        <NavLink key={n.to} to={n.to} className={({ isActive }) => `px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${isActive ? "bg-forest text-white" : "bg-secondary text-muted-foreground"}`}>{n.label}</NavLink>
                    ))}
                </div>
                <main className="p-4 sm:p-6 lg:p-8 max-w-7xl"><Outlet /></main>
            </div>
        </div>
    );
}
