import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Package } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useLang } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function TrackOrder() {
    const { t } = useLang();
    const navigate = useNavigate();
    const [orderNo, setOrderNo] = useState("");
    const [loading, setLoading] = useState(false);

    const track = async (e) => {
        e.preventDefault();
        if (!orderNo.trim()) return;
        setLoading(true);
        try {
            await api.get(`/orders/${orderNo.trim()}`);
            navigate(`/order/${orderNo.trim()}`);
        } catch (e) {
            toast.error(formatApiError(e.response?.data?.detail));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-md px-6 py-20 text-center" data-testid="track-order-page">
            <span className="grid place-items-center w-16 h-16 mx-auto rounded-2xl bg-forest/10 text-forest"><Package className="w-8 h-8" /></span>
            <h1 className="font-heading font-bold text-3xl tracking-tight mt-5">{t("track_your_order")}</h1>
            <p className="text-muted-foreground mt-2">{t("enter_order_no")}</p>
            <form onSubmit={track} className="mt-8 flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
                    <Input data-testid="track-input" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="FAIHA-..." className="ps-9 h-12 rounded-full" />
                </div>
                <Button type="submit" disabled={loading} data-testid="track-button" className="h-12 px-6 rounded-full bg-forest hover:bg-forest-dark">{t("track")}</Button>
            </form>
        </div>
    );
}
