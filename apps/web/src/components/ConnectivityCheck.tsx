import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";

interface MeResponse {
  message: string;
  user: { id: string; email: string | null };
}

const ConnectivityCheck = () => {
  const { apiFetch } = useApi();

  const { data, isLoading, isError, refetch, isFetching } = useQuery<MeResponse>({
    queryKey: ["api-me"],
    queryFn: () => apiFetch<MeResponse>("/api/me"),
    retry: false,
    staleTime: 30_000,
  });

  const status = isLoading || isFetching ? "checking" : isError ? "down" : "ok";
  const dotClass = status === "ok" ? "bg-pixel-green" : status === "down" ? "bg-pixel-red" : "bg-muted";
  const label = status === "ok" ? "Backend Connected" : status === "down" ? "Backend Unreachable" : "Checking…";

  return (
    <div
      data-testid="connectivity-check"
      data-status={status}
      className="pixel-border bg-card p-3 flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <span className={`inline-block w-2.5 h-2.5 ${dotClass} border-2 border-foreground`} />
        <span className="text-[8px] text-foreground uppercase tracking-wider">{label}</span>
      </div>
      <button
        type="button"
        onClick={() => refetch()}
        className="text-[7px] text-muted-foreground underline underline-offset-2"
      >
        Recheck
      </button>
    </div>
  );
};

export default ConnectivityCheck;
