import { BottomNav, Card } from "../components/ui";

export default function Advisor() {
  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="mx-auto w-full max-w-[640px] px-5 py-6 sm:px-6 sm:py-8">
        <h1 className="font-display text-3xl sm:text-4xl font-bold mb-6">AI Advisor</h1>
        <Card>
          <div className="text-muted text-sm">
            Chat with Ficium's AI about rates, comparisons, and decisions. Coming soon.
          </div>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
}