import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../../auth/context/AuthContext";
import { useProfile } from "../hooks/useDashboard";
import { Button, Card, BottomNav } from "../../../shared/ui";

export default function Profile() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useProfile();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="mx-auto w-full max-w-[640px] px-5 py-6 sm:px-6 sm:py-8">
        <h1 className="font-display text-3xl sm:text-4xl font-bold mb-6">Profile</h1>

        <Card>
          <div className="text-xs text-muted mb-1">Name</div>
          <div className="text-base font-semibold mb-4">{profile?.fullName ?? "—"}</div>

          <div className="text-xs text-muted mb-1">Email</div>
          <div className="text-base font-semibold mb-4">{profile?.email ?? "—"}</div>

          <div className="text-xs text-muted mb-1">KYC Status</div>
          <div className="text-base font-semibold mb-4 capitalize">{profile?.kycStatus ?? "—"}</div>

          <div className="text-xs text-muted mb-1">Health Score</div>
          <div className="text-base font-semibold mb-6">{profile?.healthScore ?? "—"} / 100</div>

          <Button variant="secondary" leftIcon={<LogOut size={16} />} onClick={handleSignOut} fullWidth>
            Sign out
          </Button>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
}