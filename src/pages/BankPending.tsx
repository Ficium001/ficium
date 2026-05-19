import { useNavigate } from "react-router-dom";
import { Clock, LogOut } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { Button, Card } from "../components/ui";

export default function BankPending() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-cream px-5 py-8 sm:px-6 sm:py-10 flex items-center justify-center">
      <div className="mx-auto w-full max-w-[520px]">
        <Card className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/40 text-ink grid place-items-center mb-6">
            <Clock size={28} />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3">
            Awaiting approval
          </h1>
          <p className="text-sm sm:text-base text-muted leading-relaxed mb-8 max-w-[400px] mx-auto">
            Your bank registration is being reviewed by our team. You'll receive an email
            once your account is approved — usually within 1-2 business days.
          </p>

          <div className="border-t border-ink/[0.06] pt-6 text-left">
            <div className="text-xs text-muted mb-1">Signed in as</div>
            <div className="text-base font-semibold mb-4">{user?.email}</div>

            <Button
              variant="secondary"
              leftIcon={<LogOut size={16} />}
              onClick={handleSignOut}
              fullWidth
            >
              Sign out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}