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
          className="drop-shadow-2xl"
        >
          {/* Card Background */}
          <rect x="20" y="20" width="360" height="240" rx="16" fill="white" stroke="#e5e7eb" strokeWidth="1" />

          {/* Header */}
          <circle cx="60" cy="60" r="16" fill="#3b82f6" />
          <rect x="90" y="50" width="120" height="8" rx="4" fill="#d1d5db" />
          <rect x="90" y="65" width="80" height="6" rx="3" fill="#e5e7eb" />

          {/* Action Buttons */}
          <circle cx="320" cy="55" r="6" fill="#e5e7eb" />
          <circle cx="340" cy="55" r="6" fill="#e5e7eb" />
          <circle cx="360" cy="55" r="6" fill="#e5e7eb" />

          {/* Chart Bars */}
          <rect x="60" y="180" width="24" height="60" rx="4" fill="#3b82f6" />
          <rect x="100" y="160" width="24" height="80" rx="4" fill="#3b82f6" />
          <rect x="140" y="140" width="24" height="100" rx="4" fill="#3b82f6" />
          <rect x="180" y="120" width="24" height="120" rx="4" fill="#3b82f6" />
          <rect x="220" y="130" width="24" height="110" rx="4" fill="#3b82f6" />
          <rect x="260" y="150" width="24" height="90" rx="4" fill="#3b82f6" />
          <rect x="300" y="160" width="24" height="80" rx="4" fill="#3b82f6" />

          {/* Trend Line */}
          <path
            d="M60 200 L100 180 L140 160 L180 140 L220 150 L260 170 L300 180"
            stroke="#ef4444"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Trend Points */}
          <circle cx="60" cy="200" r="4" fill="#ef4444" />
          <circle cx="100" cy="180" r="4" fill="#ef4444" />
          <circle cx="140" cy="160" r="4" fill="#ef4444" />
          <circle cx="180" cy="140" r="4" fill="#ef4444" />
          <circle cx="220" cy="150" r="4" fill="#ef4444" />
          <circle cx="260" cy="170" r="4" fill="#ef4444" />
          <circle cx="300" cy="180" r="4" fill="#ef4444" />

          {/* Stats Cards */}
          <rect x="60" y="100" width="80" height="30" rx="6" fill="#f3f4f6" />
          <rect x="65" y="105" width="20" height="4" rx="2" fill="#d1d5db" />
          <rect x="65" y="115" width="30" height="6" rx="3" fill="#10b981" />
          <polygon points="125,110 130,105 135,110 130,115" fill="#10b981" />

          <rect x="160" y="100" width="80" height="30" rx="6" fill="#f3f4f6" />
          <rect x="165" y="105" width="20" height="4" rx="2" fill="#d1d5db" />
          <rect x="165" y="115" width="35" height="6" rx="3" fill="#3b82f6" />
          <polygon points="225,110 230,105 235,110 230,115" fill="#3b82f6" />

          <rect x="260" y="100" width="80" height="30" rx="6" fill="#f3f4f6" />
          <rect x="265" y="105" width="20" height="4" rx="2" fill="#d1d5db" />
          <rect x="265" y="115" width="25" height="6" rx="3" fill="#ef4444" />
          <polygon points="315,115 320,110 325,115 320,120" fill="#ef4444" />
        </svg>
      </div>

      {/* Logo and Title */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-2xl">j</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Finance Tracker</h1>
        <p className="text-gray-300 text-lg">Manage your finances with ease</p>
      </div>
    </div>
  )
}
