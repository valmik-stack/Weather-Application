import { useState, useCallback, useRef, useEffect } from "react";
import axios from "axios";
import "./Weather.css";

// ─── Weather → Theme mapping ──────────────────────────────────────────────────
const THEMES = {
  Clear:        { key: "clear",  accent: "#fbbf24", icon: "☀️" },
  Clouds:       { key: "clouds", accent: "#8ecae6", icon: "☁️" },
  Rain:         { key: "rain",   accent: "#60a5fa", icon: "🌧️" },
  Drizzle:      { key: "rain",   accent: "#93c5fd", icon: "🌦️" },
  Thunderstorm: { key: "storm",  accent: "#c084fc", icon: "⛈️" },
  Snow:         { key: "snow",   accent: "#bae6fd", icon: "❄️" },
  Mist:         { key: "mist",   accent: "#d1d5db", icon: "🌫️" },
  Fog:          { key: "mist",   accent: "#d1d5db", icon: "🌫️" },
  Haze:         { key: "mist",   accent: "#fde68a", icon: "🌫️" },
  Smoke:        { key: "mist",   accent: "#9ca3af", icon: "🌫️" },
  Dust:         { key: "sand",   accent: "#d4a017", icon: "🌫️" },
  Sand:         { key: "sand",   accent: "#f59e0b", icon: "🌫️" },
  Tornado:      { key: "storm",  accent: "#6b7280", icon: "🌪️" },
};

// ─── Wind direction helper ─────────────────────────────────────────────────────
const getWindDir = (deg) => {
  if (deg == null) return "";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
};

// ─── Particle canvas hook ──────────────────────────────────────────────────────
function useParticles(canvasRef, weatherKey) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const mkRain = () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height,
      speed: (weatherKey === "storm" ? 14 : 8) + Math.random() * 6,
      len: (weatherKey === "storm" ? 22 : 14) + Math.random() * 10,
      opacity: 0.25 + Math.random() * 0.35,
      thick: 0.5 + Math.random() * (weatherKey === "storm" ? 1.2 : 0.6),
    });

    const mkSnow = () => ({
      x: Math.random() * canvas.width,
      y: -10,
      speed: 0.7 + Math.random() * 1.3,
      size: 1.5 + Math.random() * 2.5,
      drift: (Math.random() - 0.5) * 0.4,
      opacity: 0.55 + Math.random() * 0.45,
    });

    const mkStar = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 0.4 + Math.random() * 1.4,
      opacity: Math.random(),
      dir: Math.random() > 0.5 ? 1 : -1,
      speed: 0.008 + Math.random() * 0.018,
    });

    const mkDust = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 1.5 + Math.random() * 2.5,
      opacity: 0.1 + Math.random() * 0.25,
      dx: (Math.random() - 0.3) * 0.8,
      dy: -0.1 - Math.random() * 0.3,
    });

    const COUNT = {
      rain: 70, storm: 90, snow: 60, clear: 130,
      clouds: 40, mist: 30, sand: 50, default: 100,
    };

    const count = COUNT[weatherKey] ?? COUNT.default;
    const factory = {
      rain: mkRain, storm: mkRain, snow: mkSnow,
      clear: mkStar, clouds: mkStar, mist: mkDust,
      sand: mkDust, default: mkStar,
    }[weatherKey] ?? mkStar;

    for (let i = 0; i < count; i++) particles.push(factory());

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        if (weatherKey === "rain" || weatherKey === "storm") {
          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.strokeStyle = weatherKey === "storm" ? "#c4b5fd" : "#93c5fd";
          ctx.lineWidth = p.thick;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.len * 0.18, p.y + p.len);
          ctx.stroke();
          ctx.restore();
          p.y += p.speed;
          p.x -= p.speed * 0.18;
          if (p.y > canvas.height + 20) particles[i] = mkRain();

        } else if (weatherKey === "snow") {
          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = "#e0f2fe";
          ctx.shadowBlur = 6;
          ctx.shadowColor = "#bae6fd";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          p.y += p.speed;
          p.x += p.drift;
          if (p.y > canvas.height + 10) particles[i] = mkSnow();

        } else if (weatherKey === "mist" || weatherKey === "sand") {
          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = weatherKey === "sand" ? "#d4a017" : "#9ca3af";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          p.x += p.dx;
          p.y += p.dy;
          if (p.y < -10 || p.x < -10 || p.x > canvas.width + 10) {
            particles[i] = weatherKey === "sand" ? mkDust() : mkDust();
            particles[i].y = canvas.height;
          }

        } else {
          // Stars / twinkling
          p.opacity += p.speed * p.dir;
          if (p.opacity >= 1 || p.opacity <= 0) p.dir *= -1;
          const op = Math.max(0, Math.min(1, p.opacity));
          ctx.save();
          ctx.globalAlpha = op;
          ctx.fillStyle = "#ffffff";
          ctx.shadowBlur = p.size > 1 ? 6 : 2;
          ctx.shadowColor = "rgba(255,255,255,0.8)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      // Storm lightning flash
      if (weatherKey === "storm" && Math.random() < 0.003) {
        ctx.save();
        ctx.fillStyle = "rgba(196, 181, 253, 0.06)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef, weatherKey]);
}

// ─── Animated number counter hook ─────────────────────────────────────────────
function useCountTo(target, duration = 900) {
  const [displayed, setDisplayed] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    if (diff === 0) { setDisplayed(target); return; }
    const startTime = performance.now();
    let rafId;
    const tick = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(start + diff * eased));
      if (t < 1) rafId = requestAnimationFrame(tick);
      else prevRef.current = target;
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return displayed;
}

// ─── Main Weather Component ────────────────────────────────────────────────────
function Weather() {
  const [city, setCity]       = useState("");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [theme, setTheme]     = useState(null);
  const [revealed, setRevealed] = useState(false);

  const cardRef   = useRef(null);
  const canvasRef = useRef(null);
  const tiltRef   = useRef({ active: false });

  const API_KEY = "d7b91583272fb756ad4f7dc55bccecf4";

  const weatherKey = theme?.key ?? "default";
  useParticles(canvasRef, weatherKey);

  const displayTemp = useCountTo(weather ? Math.round(weather.main.temp) : 0);

  // ── 3D Tilt ──────────────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rx = -((e.clientY - cy) / (rect.height / 2)) * 10;
    const ry = ((e.clientX - cx) / (rect.width / 2)) * 10;
    card.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02,1.02,1.02)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)";
    card.style.transform  = "perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    setTimeout(() => { if (card) card.style.transition = "transform 0.12s ease-out"; }, 620);
  }, []);

  const handleMouseEnter = useCallback(() => {
    const card = cardRef.current;
    if (card) card.style.transition = "transform 0.12s ease-out";
  }, []);

  // ── Fetch ─────────────────────────────────────────────────────────────────────
  const getWeather = useCallback(async () => {
    if (!city.trim()) { setError("Please enter a city name."); return; }
    setError("");
    setWeather(null);
    setRevealed(false);
    setLoading(true);
    try {
      const { data } = await axios.get(
        "https://api.openweathermap.org/data/2.5/weather",
        { params: { q: city.trim(), appid: API_KEY, units: "metric" } }
      );
      setWeather(data);
      const main = data.weather[0].main;
      setTheme(THEMES[main] ?? { key: "default", accent: "#38bdf8", icon: "🌡️" });
      setTimeout(() => setRevealed(true), 50);
    } catch (err) {
      if (err.response?.status === 404) setError("City not found. Try a different name.");
      else if (err.request)             setError("Network error. Check your connection.");
      else                              setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [city]);

  const handleKeyDown = (e) => { if (e.key === "Enter") getWeather(); };

  const icon      = weather ? (THEMES[weather.weather[0].main]?.icon ?? "🌡️") : null;
  const accent    = theme?.accent ?? "#38bdf8";
  const themeKey  = theme?.key ?? "default";

  return (
    <div
      className={`wx-root theme-${themeKey}`}
      style={{ "--accent": accent }}
    >
      {/* Particle layer */}
      <canvas ref={canvasRef} className="wx-canvas" />

      {/* Atmospheric orbs */}
      <div className="wx-bg-grid" />
      <div className="wx-bg-noise" />
      <div className="wx-aurora wx-aurora-1" />
      <div className="wx-aurora wx-aurora-2" />
      <div className="wx-orb wx-orb-1" />
      <div className="wx-orb wx-orb-2" />
      <div className="wx-orb wx-orb-3" />

      {/* Glass card */}
      <div
        className="wx-card"
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
      >
        <div className="wx-card-glow" />
        <div className="wx-card-shimmer" />

        <div className="wx-card-inner">
          {/* Header */}
          <div className="wx-header">
            <p className="wx-title">
              <span className="wx-dot" />
              Weather Report
            </p>
            <p className="wx-subtitle">Live atmospheric intelligence</p>
          </div>

          {/* Search */}
          <div className="wx-search">
            <input
              className="wx-input"
              type="text"
              placeholder="Enter city name…"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
            <button
              className="wx-btn"
              onClick={getWeather}
              disabled={loading}
              aria-label="Search weather"
            >
              {loading
                ? <span className="wx-spinner" />
                : <span>Search</span>
              }
            </button>
          </div>

          {/* Error */}
          {error && <div className="wx-error">{error}</div>}

          {/* Skeleton loader */}
          {loading && (
            <div className="wx-skeleton">
              <div className="wx-skel wx-skel-city" />
              <div className="wx-skel wx-skel-temp" />
              <div className="wx-skel wx-skel-desc" />
              <div className="wx-skel-grid">
                {[0,1,2,3].map(i => <div key={i} className="wx-skel wx-skel-stat" />)}
              </div>
            </div>
          )}

          {/* Result */}
          {weather && !loading && (
            <div className={`wx-result ${revealed ? "wx-result--in" : ""}`}>
              {/* Location */}
              <div className="wx-location">
                <h1 className="wx-city">{weather.name}</h1>
                <p className="wx-country">
                  <span className="wx-country-dot" />
                  {weather.sys.country}
                </p>
              </div>

              {/* Temp + Icon */}
              <div className="wx-main">
                <div className="wx-temp-wrap">
                  <span className="wx-temp">{displayTemp}</span>
                  <sup className="wx-unit">°C</sup>
                </div>
                <div className="wx-icon-wrap">
                  <span className="wx-icon">{icon}</span>
                  <div className="wx-icon-ring" />
                </div>
              </div>

              {/* Description */}
              <p className="wx-desc">{weather.weather[0].description}</p>

              {/* Divider */}
              <div className="wx-divider">
                <span /><span className="wx-divider-gem" /><span />
              </div>

              {/* Stats grid */}
              <div className="wx-grid">
                {/* Humidity */}
                <div className="wx-stat wx-stat--humid" style={{ "--i": 0 }}>
                  <div className="wx-stat-accent" />
                  <span className="wx-stat-emoji">💧</span>
                  <p className="wx-stat-label">Humidity</p>
                  <p className="wx-stat-val">{weather.main.humidity}<small>%</small></p>
                  <div className="wx-bar">
                    <div className="wx-bar-fill" style={{ "--pct": `${weather.main.humidity}%` }} />
                  </div>
                </div>

                {/* Wind */}
                <div className="wx-stat wx-stat--wind" style={{ "--i": 1 }}>
                  <div className="wx-stat-accent" />
                  <span className="wx-stat-emoji">💨</span>
                  <p className="wx-stat-label">Wind</p>
                  <p className="wx-stat-val">
                    {Math.round(weather.wind.speed * 3.6)}<small> km/h</small>
                    {weather.wind.deg != null && (
                      <span className="wx-dir">{getWindDir(weather.wind.deg)}</span>
                    )}
                  </p>
                </div>

                {/* Feels like */}
                <div className="wx-stat wx-stat--feels" style={{ "--i": 2 }}>
                  <div className="wx-stat-accent" />
                  <span className="wx-stat-emoji">🌡️</span>
                  <p className="wx-stat-label">Feels like</p>
                  <p className="wx-stat-val">{Math.round(weather.main.feels_like)}<small>°C</small></p>
                </div>

                {/* Visibility */}
                <div className="wx-stat wx-stat--vis" style={{ "--i": 3 }}>
                  <div className="wx-stat-accent" />
                  <span className="wx-stat-emoji">👁️</span>
                  <p className="wx-stat-label">Visibility</p>
                  <p className="wx-stat-val">
                    {weather.visibility != null
                      ? <>{(weather.visibility / 1000).toFixed(1)}<small> km</small></>
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Weather;