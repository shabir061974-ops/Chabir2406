import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

// Runtime feature flags from the backend (/api/app/config). Fails closed: until the
// config has loaded (or if it cannot be fetched) every optional feature reads as off.
export function useFeatureFlags() {
    const { data, isLoading } = useQuery({
        queryKey: ["app-config"],
        queryFn: async () => (await api.get("/app/config")).data,
        staleTime: 5 * 60 * 1000,
    });
    const features = data?.features || {};
    return { knetEnabled: features.knet === true, isLoading };
}
