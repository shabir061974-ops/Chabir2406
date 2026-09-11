import { useQuery } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";
import api from "@/lib/api";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { WhatsAppButton } from "./WhatsAppButton";

export default function StoreLayout() {
    const { data: categories = [] } = useQuery({
        queryKey: ["categories"],
        queryFn: async () => (await api.get("/categories")).data,
    });

    return (
        <div className="min-h-screen flex flex-col bg-cream">
            <Header categories={categories} />
            <main className="flex-1" style={{ paddingTop: 'calc(5rem + 44px)' }}>
                <Outlet context={{ categories }} />
            </main>
            <Footer />
            <CartDrawer />
            <WhatsAppButton />
        </div>
    );
}
