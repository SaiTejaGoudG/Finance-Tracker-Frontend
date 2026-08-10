"use client"

export default function AuthIllustration() {
  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      {/* Dashboard Illustration */}
      <div className="relative">
        <svg
          width="400"
          height="280"
          viewBox="0 0 400 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Card Background */}
          <rect
            x="20"
            y="20"
            width="360"
            height="240"
            rx="16"
            fill="hsl(var(--card))"
            stroke="hsl(var(--border))"
            strokeWidth="1"
          />

          {/* Header */}
          <circle cx="60" cy="60" r="16" fill="hsl(var(--chart-5))" />
          <rect x="90" y="50" width="120" height="8" rx="4" fill="hsl(var(--chart-grid))" />
          <rect x="90" y="65" width="80" height="6" rx="3" fill="hsl(var(--chart-grid))" />

          {/* Action Buttons */}
          <circle cx="320" cy="55" r="6" fill="hsl(var(--chart-grid))" />
          <circle cx="340" cy="55" r="6" fill="hsl(var(--chart-grid))" />
          <circle cx="360" cy="55" r="6" fill="hsl(var(--chart-grid))" />

          {/* Chart Bars */}
          <rect x="60" y="180" width="24" height="60" rx="4" fill="hsl(var(--chart-5))" />
          <rect x="100" y="160" width="24" height="80" rx="4" fill="hsl(var(--chart-5))" />
          <rect x="140" y="140" width="24" height="100" rx="4" fill="hsl(var(--chart-5))" />
          <rect x="180" y="120" width="24" height="120" rx="4" fill="hsl(var(--chart-5))" />
          <rect x="220" y="130" width="24" height="110" rx="4" fill="hsl(var(--chart-5))" />
          <rect x="260" y="150" width="24" height="90" rx="4" fill="hsl(var(--chart-5))" />
          <rect x="300" y="160" width="24" height="80" rx="4" fill="hsl(var(--chart-5))" />

          {/* Trend Line */}
          <path
            d="M60 200 L100 180 L140 160 L180 140 L220 150 L260 170 L300 180"
            stroke="hsl(var(--chart-4))"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Trend Points */}
          <circle cx="60" cy="200" r="4" fill="hsl(var(--chart-4))" />
          <circle cx="100" cy="180" r="4" fill="hsl(var(--chart-4))" />
          <circle cx="140" cy="160" r="4" fill="hsl(var(--chart-4))" />
          <circle cx="180" cy="140" r="4" fill="hsl(var(--chart-4))" />
          <circle cx="220" cy="150" r="4" fill="hsl(var(--chart-4))" />
          <circle cx="260" cy="170" r="4" fill="hsl(var(--chart-4))" />
          <circle cx="300" cy="180" r="4" fill="hsl(var(--chart-4))" />

          {/* Stats Cards */}
          <rect x="60" y="100" width="80" height="30" rx="6" fill="hsl(var(--muted))" />
          <rect x="65" y="105" width="20" height="4" rx="2" fill="hsl(var(--chart-grid))" />
          <rect x="65" y="115" width="30" height="6" rx="3" fill="hsl(var(--chart-3))" />
          <polygon points="125,110 130,105 135,110 130,115" fill="hsl(var(--chart-3))" />

          <rect x="160" y="100" width="80" height="30" rx="6" fill="hsl(var(--muted))" />
          <rect x="165" y="105" width="20" height="4" rx="2" fill="hsl(var(--chart-grid))" />
          <rect x="165" y="115" width="35" height="6" rx="3" fill="hsl(var(--chart-5))" />
          <polygon points="225,110 230,105 235,110 230,115" fill="hsl(var(--chart-5))" />

          <rect x="260" y="100" width="80" height="30" rx="6" fill="hsl(var(--muted))" />
          <rect x="265" y="105" width="20" height="4" rx="2" fill="hsl(var(--chart-grid))" />
          <rect x="265" y="115" width="25" height="6" rx="3" fill="hsl(var(--chart-4))" />
          <polygon points="315,115 320,110 325,115 320,120" fill="hsl(var(--chart-4))" />
        </svg>
      </div>

      {/* Logo and Title */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-primary font-bold text-2xl">j</span>
        </div>
        <h1 className="text-3xl font-bold text-primary-foreground">Finance Tracker</h1>
        <p className="text-primary-foreground/70 text-lg">Manage your finances with ease</p>
      </div>
    </div>
  )
}
