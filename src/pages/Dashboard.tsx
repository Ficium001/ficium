import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { Button, Card } from "../components/ui";
import { LogOut } from "lucide-react";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-cream px-5 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[640px]">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-bold">Dashboard</h1>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<LogOut size={16} />}
            onClick={handleSignOut}
          >
            Sign out
          </Button>
        </div>

        <Card>
          <div className="text-muted text-sm mb-2">Signed in as</div>
          <div className="text-lg font-semibold">{user?.email}</div>
          <div className="text-xs text-muted mt-2 font-mono">{user?.id}</div>

          <hr className="my-6 border-ink/10" />

          <div className="text-muted text-sm">
            This is your placeholder dashboard. The real client home (requests overview,
            active bids, AI advisor) will live here once we build it.
          </div>
        </Card>
      </div>
    </div>
  );
}