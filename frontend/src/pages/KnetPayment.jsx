import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useLang } from "@/context/LanguageContext";
import { formatKD } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function KnetPayment() {
    const { orderNo } = useParams();
    const { t } = useLang();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [processing, setProcessing] = useState(false);

    const { data: order } = useQuery({
        queryKey: ["order", orderNo],
        queryFn: async () => (await api.get(`/orders/${orderNo}`)).data,
    });

    const pay = async (result) => {
        setProcessing(true);
        try {
            const { data } = await api.post("/payments/knet/callback", { order_no: orderNo, result });
            queryClient.setQueryData(["order", orderNo], data.order);
            await queryClient.invalidateQueries({ queryKey: ["order", orderNo], refetchType: "active" });
            if (data.success) toast.success("Payment captured");
            else toast.error("Payment cancelled");
            navigate(`/order/${orderNo}`);
        } catch (e) {
            toast.error(formatApiError(e.response?.data?.detail));
            setProcessing(false);
        }
    };

    return (
        <div className="min-h-[70vh] grid place-items-center px-4 py-12" data-testid="knet-payment-page">
            <div className="w-full max-w-md rounded-3xl bg-white border border-border overflow-hidden shadow-xl">
                <div className="bg-gradient-to-br from-[#005baa] to-[#0a3d6e] text-white p-6 text-center">
                    <div className="flex items-center justify-center gap-2 font-heading font-extrabold text-2xl tracking-wider">
                        <CreditCard className="w-7 h-7" /> KNET
                    </div>
                    <p className="text-white/80 text-sm mt-1">{t("knet_gateway")}</p>
                </div>
                <div className="p-7 text-center">
                    <p className="text-sm text-muted-foreground">{t("payment_amount")}</p>
                    <p className="font-heading font-extrabold text-4xl text-forest mt-1" data-testid="knet-amount">
                        {order ? formatKD(order.net_payable) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{orderNo}</p>

                    <div className="mt-7 space-y-3">
                        <Button onClick={() => pay("CAPTURED")} disabled={processing} data-testid="knet-success"
                            className="w-full h-12 rounded-full bg-forest hover:bg-forest-dark text-white font-semibold">
                            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : t("simulate_success")}
                        </Button>
                        <Button onClick={() => pay("CANCELLED")} disabled={processing} variant="outline" data-testid="knet-fail"
                            className="w-full h-12 rounded-full border-destructive/40 text-destructive hover:bg-destructive/5">
                            {t("simulate_fail")}
                        </Button>
                    </div>
                    <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                        <ShieldCheck className="w-4 h-4" /> Simulated KNET hosted payment page
                    </p>
                </div>
            </div>
        </div>
    );
}
