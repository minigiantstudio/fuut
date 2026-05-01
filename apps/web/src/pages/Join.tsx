import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSession } from "@/contexts/SessionContext";
import Onboarding from "@/components/Onboarding";

const JoinPage = () => {
  const { code } = useParams<{ code: string }>();
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      navigate("/", { replace: true });
    }
  }, [session, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <Onboarding prefilledCode={code} />;
};

export default JoinPage;
