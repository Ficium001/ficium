import { BottomNav, Card } from "../components/ui";

export default function Alerts() {
  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="mx-auto w-full max-w-[640px] px-5 py-6 sm:px-6 sm:py-8">
        <h1 className="font-display text-3xl sm:text-4xl font-bold mb-6">Alerts</h1>
        <Card>
          <div className="text-muted text-sm">
            Bid notifications, rate-drop alerts, and KYC reminders will appear here.
          </div>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
}