"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);

  const features = [
    {
      icon: "🎵",
      title: "Akıllı Kontrol",
      description: "Sesli komutlarla tam müzik kontrolü",
      color: "green",
    },
    {
      icon: "🎯",
      title: "Kişisel Asistan",
      description: "Zevkinizi öğrenir, mükemmel öneriler sunar",
      color: "purple",
    },
    {
      icon: "⚡",
      title: "Anlık Yanıt",
      description: "Real-time API bağlantısı",
      color: "blue",
    },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    const featureTimer = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      clearTimeout(timer);
      clearInterval(featureTimer);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <>
      <div className="min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
        {/* Enhanced dynamic background */}
        <div
          className="fixed inset-0 opacity-40 transition-all duration-[2000ms] ease-out"
          style={{
            background: `
              radial-gradient(800px circle at ${mousePosition.x}% ${
              mousePosition.y
            }%, 
                rgba(29, 78, 216, 0.15), transparent 70%),
              radial-gradient(600px circle at ${100 - mousePosition.x}% ${
              100 - mousePosition.y
            }%, 
                rgba(147, 51, 234, 0.1), transparent 70%)
            `,
          }}
        />

        {/* Floating orbs with better positioning */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-green-500/8 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute top-2/3 right-1/4 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute bottom-1/3 left-1/2 w-64 h-64 bg-blue-500/8 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "2s" }}
          />
        </div>

        <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
          {/* Enhanced main content */}
          <div
            className={`space-y-12 transition-all duration-1000 ${
              isLoaded
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-12"
            }`}
            role="main"
            aria-label="MelodAI Ana İçerik"
          >
            {/* Hero section */}
            <div className="space-y-6">
              <div className="relative">
                <h1 className="text-7xl md:text-9xl font-black bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 leading-tight">
                  MelodAI
                </h1>
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full animate-ping"></div>
              </div>

              <div className="space-y-2">
                <div className="text-base md:text-lg font-mono text-green-400/80 tracking-[0.3em] font-light">
                  SPOTIFY × ARTIFICIAL INTELLIGENCE
                </div>
                <div className="text-sm text-gray-400 font-light max-w-md mx-auto">
                  Yapay zeka destekli müzik deneyiminin geleceği
                </div>
              </div>
            </div>

            {/* Enhanced glassmorphism card */}
            <div className="backdrop-blur-lg bg-white/[0.03] border border-white/10 rounded-[2rem] p-10 md:p-14 max-w-4xl mx-auto shadow-2xl relative overflow-hidden">
              {/* Card glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-purple-500/5 rounded-[2rem]"></div>

              <div className="relative space-y-8">
                <div className="space-y-4">
                  <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                    Size Her Şeyi Ayarlayabilir
                  </h2>

                  <p className="text-xl text-gray-200 leading-relaxed max-w-3xl mx-auto font-light">
                    Spotify hesabınızla canlı bağlantı kurar, müzik zevkinizi
                    analiz eder ve size özel deneyimler yaratır. Gerçek zamanlı
                    müzikal büyü.
                  </p>
                </div>

                {/* Enhanced feature cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {features.map((feature, index) => (
                    <div
                      key={index}
                      className={`
                        relative p-6 rounded-2xl border transition-all duration-500 cursor-pointer group
                        ${
                          currentFeature === index
                            ? `bg-${feature.color}-500/15 border-${feature.color}-500/30 scale-105`
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }
                      `}
                    >
                      <div className="space-y-3">
                        <div className="text-3xl">{feature.icon}</div>
                        <div
                          className={`font-semibold text-lg ${
                            currentFeature === index
                              ? `text-${feature.color}-300`
                              : "text-white"
                          }`}
                        >
                          {feature.title}
                        </div>
                        <div className="text-gray-300 text-sm leading-relaxed">
                          {feature.description}
                        </div>
                      </div>

                      {/* Active indicator */}
                      {currentFeature === index && (
                        <div
                          className={`absolute top-2 right-2 w-2 h-2 bg-${feature.color}-400 rounded-full animate-pulse`}
                        ></div>
                      )}
                    </div>
                  ))}
                </div>

                {/* API Status */}
                <div className="flex items-center justify-center gap-3 pt-6">
                  <div className="relative">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-75"></div>
                  </div>
                  <span className="text-sm text-gray-300 font-mono">
                    AI Agent Online
                  </span>
                  <div className="text-xs text-gray-500">•</div>
                  <span className="text-xs text-gray-500 font-mono">
                    v1.0.0
                  </span>
                </div>
              </div>
            </div>

            {/* Enhanced tech stack */}
            <div className="grid grid-cols-3 gap-8 max-w-md mx-auto pt-8">
              <div className="text-center space-y-2">
                <div className="text-xs text-gray-400 font-mono">FRONTEND</div>
                <div className="text-sm text-white">Next.js 14</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-xs text-gray-400 font-mono">API</div>
                <div className="text-sm text-white">Spotify Web</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-xs text-gray-400 font-mono">AI</div>
                <div className="text-sm text-white">OpenAI GPT-4</div>
              </div>
            </div>
          </div>
        </main>

        {/* Enhanced animated grid */}
        <div className="fixed inset-0 opacity-[0.02] pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
              animation: "grid-move 30s linear infinite",
            }}
          />
        </div>

        {/* CSS Animations */}
        <style jsx>{`
          @keyframes grid-move {
            0% {
              transform: translate(0, 0);
            }
            100% {
              transform: translate(60px, 60px);
            }
          }

          @keyframes float {
            0%,
            100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-10px);
            }
          }
        `}</style>
      </div>
    </>
  );
}
