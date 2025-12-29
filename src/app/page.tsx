"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getResumableGamesAction,
  resumeGameAction,
  type ResumableGame,
} from "@/app/actions/game-actions";

// 4X Feature Cards Data
const features = [
  {
    title: "EXPLORE",
    icon: "🔭",
    description: "Survey the galaxy through your Star Chart. Gather intelligence on rival empires through covert operations.",
    color: "from-blue-600 to-cyan-500",
    borderColor: "border-lcars-blue",
  },
  {
    title: "EXPAND",
    icon: "🌍",
    description: "Acquire new sectors to grow your domain. Each planet type provides unique resources and capabilities.",
    color: "from-green-600 to-emerald-500",
    borderColor: "border-lcars-mint",
  },
  {
    title: "EXPLOIT",
    icon: "⚡",
    description: "Harvest resources, grow your population, and research powerful technologies to gain an edge.",
    color: "from-yellow-600 to-amber-500",
    borderColor: "border-lcars-amber",
  },
  {
    title: "EXTERMINATE",
    icon: "⚔️",
    description: "Build fleets, train armies, and crush your rivals. Only the strongest empire will dominate the galaxy.",
    color: "from-red-600 to-rose-500",
    borderColor: "border-lcars-salmon",
  },
];

// How to Play Sections
const howToPlaySections = [
  {
    title: "Getting Started",
    content: `When you start a new game, you'll be given a small empire with basic resources and a few planets. You have 20 turns of protection where no one can attack you - use this time wisely to build up your economy and military.

Your Command Center (dashboard) shows your current resources, population, and military strength. Check it often to monitor your empire's health.`,
  },
  {
    title: "Resources & Economy",
    content: `There are 5 key resources:
• Credits - Your currency for buying units and planets
• Food - Feeds your population (shortage causes starvation!)
• Raw Materials (Ore) - Used for construction and crafting
• Plasma (Petroleum) - Powers advanced units and operations
• Research Points - Invest these to unlock new technologies

Buy different planet types to produce the resources you need. Balance is key!`,
  },
  {
    title: "Military & Combat",
    content: `Build a diverse military force:
• Marines (soldiers) - Ground troops, cheap but essential
• Drones (fighters) - Fast attack craft
• Frigates & Cruisers - Main battle fleet
• Carriers - Heavy assault ships
• Covert Agents - Spies for intel and sabotage

Combat happens in 3 phases: Space Battle → Orbital Bombardment → Ground Assault. A diverse army gets bonuses!`,
  },
  {
    title: "Diplomacy & Intelligence",
    content: `You don't have to fight alone:
• Non-Aggression Pacts - Prevent attacks between empires
• Alliances - Mutual defense agreements
• Messages - Communicate with rival empires

Use Intel Ops to spy on enemies, steal technology, or sabotage their operations. Knowledge is power - you can't see enemy strength without intelligence!`,
  },
  {
    title: "Victory Conditions",
    content: `There are 3 ways to win:
• Conquest Victory - Control 60% of all planets in the galaxy
• Economic Victory - Achieve 1.5x the networth of all other empires combined
• Survival Victory - Be the strongest empire when turn 200 ends

Plan your strategy accordingly - will you conquer, trade, or simply outlast?`,
  },
];

// Star background component
function StarField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Static stars layer */}
      <div className="absolute inset-0">
        {Array.from({ length: 100 }).map((_, i) => {
          const seed = i * 127;
          const x = (seed * 31) % 100;
          const y = (seed * 37) % 100;
          const size = 0.5 + ((seed * 41) % 20) / 10;
          const delay = ((seed * 43) % 50) / 10;
          const duration = 2 + ((seed * 47) % 40) / 10;

          return (
            <div
              key={i}
              className="absolute rounded-full bg-white star-twinkle"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: `${size}px`,
                height: `${size}px`,
                "--twinkle-delay": `${delay}s`,
                "--twinkle-duration": `${duration}s`,
              } as React.CSSProperties}
            />
          );
        })}
      </div>
      {/* Nebula gradient overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-purple-900/20 via-transparent to-blue-900/20" />
    </div>
  );
}

// Accordion component for How to Play
function HowToPlayAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-2">
      {howToPlaySections.map((section, index) => (
        <div
          key={index}
          className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900/50"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full px-4 py-3 flex justify-between items-center text-left hover:bg-gray-800/50 transition-colors"
          >
            <span className="font-display text-lcars-amber">{section.title}</span>
            <span className="text-gray-400 text-xl">
              {openIndex === index ? "−" : "+"}
            </span>
          </button>
          {openIndex === index && (
            <div className="px-4 pb-4 text-gray-300 text-sm leading-relaxed whitespace-pre-line">
              {section.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Screenshot carousel placeholder
function ScreenshotCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const screenshots = [
    { title: "Star Chart", description: "Navigate the galaxy and monitor rival empires" },
    { title: "Command Center", description: "Manage your resources and track your progress" },
    { title: "Forces", description: "Build and command your military forces" },
    { title: "Combat", description: "Launch attacks and defend your territory" },
  ];

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % screenshots.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + screenshots.length) % screenshots.length);

  const currentScreenshot = screenshots[currentSlide] ?? screenshots[0];

  return (
    <div className="relative">
      {/* Screenshot placeholder */}
      <div className="aspect-video bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center overflow-hidden">
        <div className="text-center p-8">
          <div className="text-6xl mb-4 opacity-50">📸</div>
          <p className="text-lcars-amber font-display text-xl mb-2">
            {currentScreenshot?.title}
          </p>
          <p className="text-gray-400 text-sm">
            {currentScreenshot?.description}
          </p>
          <p className="text-gray-600 text-xs mt-4">
            Screenshot placeholder - Add image to /public/screenshots/
          </p>
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-gray-900/80 hover:bg-gray-800 rounded-full flex items-center justify-center text-lcars-amber transition-colors"
      >
        ‹
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-gray-900/80 hover:bg-gray-800 rounded-full flex items-center justify-center text-lcars-amber transition-colors"
      >
        ›
      </button>

      {/* Dots indicator */}
      <div className="flex justify-center gap-2 mt-4">
        {screenshots.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentSlide ? "bg-lcars-amber" : "bg-gray-600"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [resumableGames, setResumableGames] = useState<ResumableGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [resuming, setResuming] = useState<string | null>(null);

  useEffect(() => {
    async function loadResumableGames() {
      const games = await getResumableGamesAction();
      setResumableGames(games);
      setLoading(false);
    }
    loadResumableGames();
  }, []);

  const handleResume = async (gameId: string) => {
    setResuming(gameId);
    const result = await resumeGameAction(gameId);
    if (result.success) {
      router.push("/game/starmap");
    } else {
      alert(result.error || "Failed to resume game");
      setResuming(null);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden">
        <StarField />

        <div className="relative z-10 text-center max-w-4xl">
          {/* Logo */}
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-display text-lcars-amber mb-4 tracking-wider animate-pulse-slow">
            X-IMPERIUM
          </h1>

          {/* Tagline */}
          <p className="text-xl md:text-2xl lg:text-3xl text-gray-300 mb-4 font-body">
            Command Your Galactic Empire
          </p>
          <p className="text-gray-500 mb-12 max-w-2xl mx-auto">
            A turn-based strategy game of exploration, expansion, and conquest.
            Build your economy, forge alliances, and dominate the galaxy.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link
              href="/game"
              className="inline-block px-10 py-4 bg-lcars-amber text-gray-950 font-semibold text-lg rounded-lcars-pill hover:brightness-110 transition-all duration-200 hover:scale-105 shadow-lg shadow-lcars-amber/20"
            >
              START YOUR CONQUEST
            </Link>
            <a
              href="#how-to-play"
              className="inline-block px-8 py-4 bg-transparent border-2 border-lcars-lavender text-lcars-lavender font-semibold text-lg rounded-lcars-pill hover:bg-lcars-lavender hover:text-gray-950 transition-all duration-200"
            >
              HOW TO PLAY
            </a>
          </div>

          {/* Resume Games */}
          {!loading && resumableGames.length > 0 && (
            <div className="mt-8">
              <p className="text-gray-500 text-sm mb-3">Or continue your conquest:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {resumableGames.slice(0, 3).map((game) => (
                  <button
                    key={game.gameId}
                    onClick={() => handleResume(game.gameId)}
                    disabled={resuming !== null}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-lcars-orange/30 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    <span className="text-lcars-amber font-medium">
                      {game.empireName}
                    </span>
                    <span className="text-gray-500 ml-2">Turn {game.turn}</span>
                    {resuming === game.gameId && (
                      <span className="text-gray-400 ml-2">Loading...</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <span className="text-gray-500 text-2xl">↓</span>
          </div>
        </div>
      </section>

      {/* 4X Feature Cards */}
      <section className="py-20 px-8 bg-gradient-to-b from-gray-950 to-gray-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display text-center text-lcars-lavender mb-4">
            THE 4X EXPERIENCE
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Master the four pillars of galactic domination
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className={`relative p-6 bg-gray-900/80 rounded-lg border-l-4 ${feature.borderColor} hover:bg-gray-800/80 transition-all duration-300 group`}
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className={`text-xl font-display bg-gradient-to-r ${feature.color} bg-clip-text text-transparent mb-3`}>
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section className="py-20 px-8 bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display text-center text-lcars-blue mb-4">
            SEE THE GALAXY
          </h2>
          <p className="text-gray-400 text-center mb-12">
            Preview the interface that will be at your command
          </p>

          <ScreenshotCarousel />
        </div>
      </section>

      {/* How to Play Section */}
      <section id="how-to-play" className="py-20 px-8 bg-gradient-to-b from-gray-900 to-gray-950">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display text-center text-lcars-mint mb-4">
            HOW TO PLAY
          </h2>
          <p className="text-gray-400 text-center mb-12">
            Everything you need to know to begin your conquest
          </p>

          <HowToPlayAccordion />

          {/* CTA after How to Play */}
          <div className="text-center mt-12">
            <Link
              href="/game"
              className="inline-block px-10 py-4 bg-lcars-amber text-gray-950 font-semibold text-lg rounded-lcars-pill hover:brightness-110 transition-all duration-200 hover:scale-105"
            >
              BEGIN YOUR EMPIRE
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-8 bg-gray-950 border-t border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <div className="flex gap-4">
            <span>X-Imperium v0.7.0</span>
            <span>•</span>
            <span>Milestone 7: Landing Page & UX</span>
          </div>
          <div className="flex gap-6">
            <span>A modernization of Solar Imperium</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
