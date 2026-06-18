export default function BarChartIcon({ className = "w-30 h-30" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 240"
      className={className}
      role="img"
      aria-label="3D bar chart icon"
    >
      <defs>
        <linearGradient id="pinkFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff9ec7" />
          <stop offset="1" stopColor="#ff4f93" />
        </linearGradient>
        <linearGradient id="pinkTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd6e8" />
          <stop offset="1" stopColor="#ff8fbf" />
        </linearGradient>
        <linearGradient id="pinkSide" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e23a7c" />
          <stop offset="1" stopColor="#b32862" />
        </linearGradient>

        <linearGradient id="goldFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="1" stopColor="#ffae3a" />
        </linearGradient>
        <linearGradient id="goldTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3c9" />
          <stop offset="1" stopColor="#ffd06a" />
        </linearGradient>
        <linearGradient id="goldSide" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f59324" />
          <stop offset="1" stopColor="#cf7613" />
        </linearGradient>

        <linearGradient id="tealFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8af3df" />
          <stop offset="1" stopColor="#22c9a8" />
        </linearGradient>
        <linearGradient id="tealTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c8fbef" />
          <stop offset="1" stopColor="#6fe7d0" />
        </linearGradient>
        <linearGradient id="tealSide" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1aa78b" />
          <stop offset="1" stopColor="#138570" />
        </linearGradient>

        <linearGradient id="blueFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9db8ff" />
          <stop offset="1" stopColor="#5167f6" />
        </linearGradient>
        <linearGradient id="blueTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d4ddff" />
          <stop offset="1" stopColor="#8ea3ff" />
        </linearGradient>
        <linearGradient id="blueSide" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3f4fd6" />
          <stop offset="1" stopColor="#2f3bab" />
        </linearGradient>

        <filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>

      <ellipse cx="120" cy="186" rx="86" ry="16" fill="#000" opacity="0.28" />

      <g filter="url(#softShadow)">
        {/* Pink bar */}
        <g>
          <polygon points="44,138 64,128 84,138 64,148" fill="url(#pinkTop)" />
          <polygon points="44,138 64,148 64,182 44,172" fill="url(#pinkFront)" />
          <polygon points="64,148 84,138 84,172 64,182" fill="url(#pinkSide)" />
        </g>

        {/* Gold bar */}
        <g>
          <polygon points="86,116 106,106 126,116 106,126" fill="url(#goldTop)" />
          <polygon points="86,116 106,126 106,182 86,172" fill="url(#goldFront)" />
          <polygon points="106,126 126,116 126,172 106,182" fill="url(#goldSide)" />
        </g>

        {/* Teal bar */}
        <g>
          <polygon points="128,92 148,82 168,92 148,102" fill="url(#tealTop)" />
          <polygon points="128,92 148,102 148,182 128,172" fill="url(#tealFront)" />
          <polygon points="148,102 168,92 168,172 148,182" fill="url(#tealSide)" />
        </g>

        {/* Blue bar */}
        <g>
          <polygon points="170,66 190,56 210,66 190,76" fill="url(#blueTop)" />
          <polygon points="170,66 190,76 190,182 170,172" fill="url(#blueFront)" />
          <polygon points="190,76 210,66 210,172 190,182" fill="url(#blueSide)" />
        </g>
      </g>
    </svg>
  );
}
