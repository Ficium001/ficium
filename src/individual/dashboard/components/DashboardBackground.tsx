// Pure decorative — the dark gradient behind the top hero section.
// Separated so Dashboard.tsx doesn't open with 20 lines of gradient markup.

export function DashboardBackground() {
  return (
    <div className="absolute top-0 left-0 right-0 h-[540px] overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 30%, rgba(79,70,229,0.5) 0%, transparent 55%), " +
            "radial-gradient(ellipse at 85% 60%, rgba(201,168,76,0.25) 0%, transparent 50%), " +
            "radial-gradient(ellipse at 50% 80%, rgba(139,92,246,0.2) 0%, transparent 50%)",
        }}
      />
      <div className="absolute top-20 -left-16 w-64 h-64 rounded-full bg-ficium/15 blur-[80px] animate-pulse" />
      <div
        className="absolute top-40 -right-20 w-80 h-80 rounded-full bg-amber-400/10 blur-[100px] animate-pulse"
        style={{ animationDelay: "2s" }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-cream to-transparent" />
    </div>
  );
}
