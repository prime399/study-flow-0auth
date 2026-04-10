"use client"

import GoToActionButton from "@/components/go-to-action-button"
import Logo from "@/components/logo"
import Header from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Meteors from "@/components/ui/meteors"
import { Highlighter } from "@/components/ui/highlighter"
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"
import { Marquee } from "@/components/ui/marquee"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { cn } from "@/lib/utils"
import {
  BarChart,
  BookOpen,
  Check,
  Clock,
  Crown,
  Github,
  Key,
  Rocket,
  Sparkles,
  Star,
  Target,
  Timer,
  Trophy,
  Users,
  Zap,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { HeroBackground } from "@/components/hero-background"

const features = [
  {
    icon: <Timer className="h-12 w-12" />,
    title: "Focus Timer",
    description: "Customizable study sessions with break reminders",
    badge: "Popular",
  },
  {
    icon: <Trophy className="h-12 w-12" />,
    title: "Competitive Learning",
    description: "Global and group-based leaderboards",
  },
  {
    icon: <Users className="h-12 w-12" />,
    title: "Study Groups",
    description: "Create and join study groups for collaborative learning",
    badge: "New",
  },
  {
    icon: <BarChart className="h-12 w-12" />,
    title: "Progress Analytics",
    description: "Detailed insights into your study patterns",
  },
  {
    icon: <Target className="h-12 w-12" />,
    title: "Goal Setting",
    description: "Set and track daily and weekly study goals",
  },
  {
    icon: <Zap className="h-12 w-12" />,
    title: "Achievements",
    description: "Earn rewards for consistent study habits",
  },
]

const stats = [
  {
    value: "5,000+",
    label: "Active Students",
    icon: <Users className="h-4 w-4" />,
  },
  {
    value: "500K+",
    label: "Study Hours",
    icon: <Clock className="h-4 w-4" />,
  },
  {
    value: "2,500+",
    label: "Study Groups",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    value: "25+",
    label: "Universities",
    icon: <Star className="h-4 w-4" />,
  },
]

const testimonials = [
  {
    name: "Sarah Chen",
    username: "@sarahc_studies",
    body: "StudyFlow helped me improve my GPA from 3.2 to 3.8 in just one semester. The focus timer is a game-changer!",
    img: "https://avatar.vercel.sh/sarah",
  },
  {
    name: "Marcus Rodriguez",
    username: "@marcus_learns",
    body: "The study groups feature connected me with amazing peers. We motivated each other to achieve our goals.",
    img: "https://avatar.vercel.sh/marcus",
  },
  {
    name: "Emily Watson",
    username: "@emily_achieves",
    body: "I love the progress analytics. Seeing my study patterns helped me optimize my learning schedule.",
    img: "https://avatar.vercel.sh/emily",
  },
  {
    name: "David Kim",
    username: "@david_studies",
    body: "The competitive leaderboards make studying fun! I never thought I'd be excited about study sessions.",
    img: "https://avatar.vercel.sh/david",
  },
  {
    name: "Lisa Thompson",
    username: "@lisa_learns",
    body: "StudyFlow's goal setting feature keeps me accountable. I've been more consistent than ever before.",
    img: "https://avatar.vercel.sh/lisa",
  },
  {
    name: "Alex Johnson",
    username: "@alex_focus",
    body: "The AI-powered insights helped me identify my most productive study times. Brilliant!",
    img: "https://avatar.vercel.sh/alex",
  },
]

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    period: "month",
    description: "Perfect for individuals starting their journey",
    icon: Sparkles,
    earlyBird: true,
    features: [
      "Basic Integration",
      "Limited Model Selection",
      "20 Queries Monthly",
      "Focus timer & goal tracking",
      "Community support access",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "month",
    description: "Unlock powerful automations and insights",
    icon: Rocket,
    discount: "Most Popular",
    earlyBird: true,
    features: [
      "Spotify & Google Calendar integration",
      "Advanced AI model selection",
      "100 Queries Monthly",
      "Advanced Study Insights",
      "Priority in-app support",
      "API access",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "BYOK",
    price: "$19",
    period: "month",
    description: "Bring your own API key for limitless personalization",
    icon: Key,
    note: "Powered by Auth0",
    earlyBird: true,
    features: [
      "Use your own OpenAI or Anthropic key",
      "Unlimited AI queries (metered by your key)",
      "Granular rate limit controls",
      "Usage analytics & cost visibility",
      "Workspace-level access policies",
      "Dedicated BYOK onboarding support",
    ],
    cta: "Connect Your Key",
    popular: false,
  },
  {
    name: "Lifetime",
    price: "Custom",
    period: "",
    description: "For power users with unlimited needs",
    icon: Crown,
    earlyBird: false,
    features: [
      "Everything advanced",
      "Lifetime Updates",
      "Uncapped AI Queries",
      "Easy Progress Export",
      "White-glove implementation",
      "Priority concierge support",
    ],
    cta: "Contact Sales",
    popular: false,
  },
]

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-black relative overflow-x-hidden">
      {/* Midnight Mist */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 100%, rgba(70, 85, 110, 0.15) 0%, transparent 60%),
            radial-gradient(circle at 50% 100%, rgba(99, 102, 241, 0.12) 0%, transparent 70%),
            radial-gradient(circle at 50% 100%, rgba(181, 184, 208, 0.08) 0%, transparent 80%)
          `,
        }}
      />
      
      <div className="flex min-h-screen flex-col relative z-10 overflow-x-hidden">
        <Header />
        <header className="sticky top-0 z-50 hidden w-full border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-sm md:block">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between w-full">
              <Logo />
              <GoToActionButton />
            </div>
          </div>
        </header>

        <main className="relative flex-1 overflow-x-hidden">

        <section className="relative mx-auto space-y-6 sm:space-y-8 py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 overflow-x-hidden">
          {/* Meteors for mobile/tablet only */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
            <Meteors number={4} />
          </div>
          
          <div className="mx-auto flex max-w-[64rem] flex-col items-center gap-6 sm:gap-8 text-center relative">
            {/* Hero Background - UnicornScene with Spotlight fallback (desktop only) */}
            <HeroBackground />
            <h1 className="text-pretty text-2xl font-bold sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-white leading-tight relative" style={{ zIndex: 10 }}>
              Study. Connect. <span className="lg:hidden"><Highlighter 
                action="highlight" 
                color="#2563eb" 
                strokeWidth={1}
                animationDuration={1200}
                isView={true}
                padding={1}
              >
                Achieve.
              </Highlighter></span><span className="hidden lg:inline">Achieve.</span>
            </h1>
            <p className="max-w-[42rem] leading-normal text-gray-300 text-base sm:text-lg lg:text-xl lg:leading-8 px-4 relative" style={{ zIndex: 10 }}>
              Your intelligent study companion. Track progress, collaborate with peers, 
              and unlock your academic potential with AI-powered insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-4 items-center justify-center relative" style={{ zIndex: 10 }}>
              <Link href="/dashboard">
                <InteractiveHoverButton className="rounded-full bg-amber-500 hover:bg-blue-600 text-white border-amber-500 hover:border-blue-600 text-sm sm:text-base py-2 sm:py-3 px-6 sm:px-8">
                  Get Started
                </InteractiveHoverButton>
              </Link>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full sm:size-lg text-sm sm:text-base py-2 sm:py-3 px-6 sm:px-8"
                asChild
              >
                <Link
                  href={"http://github.com/prime399/study-flow/"}
                  target="_blank"
                >
                  <Github className="h-3 w-3 sm:h-4 sm:w-4" />
                  Github
                </Link>
              </Button>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 px-4">
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-1 sm:gap-2 p-3 sm:p-4">
                <div className="flex items-center gap-1 sm:gap-2 text-white">
                  {stat.icon}
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold">{stat.value}</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-300 text-center">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto max-w-5xl p-2 sm:p-4">
            <div className="relative w-full rounded-[12px] border border-white/10 shadow-xl overflow-hidden bg-white/5 backdrop-blur-sm">
              <div className="relative w-full">
                <Image
                  src="/main-dashboard.webp"
                  alt="StudyFlow Dashboard Preview"
                  width={1200}
                  height={800}
                  className="w-full h-auto object-contain rounded-[12px]"
                  priority
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 overflow-x-hidden">
          <div className="mb-12 sm:mb-16 text-center max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl xl:text-5xl text-white mb-4 sm:mb-6">
              Everything you need to excel
            </h2>
            <p className="text-base sm:text-lg text-gray-300 leading-relaxed px-4">
              Comprehensive tools designed for serious students who want to maximize their potential
            </p>
          </div>

          <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto w-full">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group relative p-6 sm:p-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:bg-white/[0.04] hover:border-white/10"
              >
                <div className="mb-4 sm:mb-6">
                  <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/5 text-white/70 group-hover:text-white group-hover:bg-white/10 transition-all duration-300">
                    {feature.icon}
                  </div>
                  {feature.badge && (
                    <Badge variant="secondary" className="mt-2 bg-white/10 text-white/80 border-white/20 text-xs">
                      {feature.badge}
                    </Badge>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3 group-hover:text-white transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-12 sm:py-16 lg:py-20 w-full overflow-hidden">
          <div className="w-full">
            <div className="text-center mb-8 sm:mb-12 px-4">
              <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl xl:text-5xl text-white mb-4 sm:mb-6">
                What Students Are Saying
              </h2>
              <p className="text-base sm:text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto">
                Join thousands of students who have transformed their study habits with StudyFlow
              </p>
            </div>

            {/* Mobile: Horizontal Scroll */}
            <div className="md:hidden px-4">
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 -mx-4 px-4">
                {testimonials.map((review, idx) => (
                  <div
                    key={idx}
                    className="flex-shrink-0 w-[85vw] max-w-sm snap-center rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative">
                        <Image
                          className="h-11 w-11 rounded-full border-2 border-white/10 ring-2 ring-white/5 object-cover"
                          src={review.img}
                          alt={`${review.name} avatar`}
                          width={56}
                          height={56}
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-black" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white tracking-tight">
                          {review.name}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                          {review.username}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed font-light">
                      &ldquo;{review.body}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop: Auto-play Marquee */}
            <div className="hidden md:block overflow-x-hidden">
              <Marquee pauseOnHover repeat={6} className="[--duration:60s] py-2 sm:py-4">
                {testimonials.map((review, idx) => (
                  <div
                    key={idx}
                    className="mx-2 sm:mx-4 w-72 sm:w-80 md:w-96 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 sm:p-7 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] hover:shadow-[0_12px_48px_0_rgba(0,0,0,0.6)] transition-all duration-500 hover:border-white/20 hover:bg-white/[0.05] hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
                      <div className="relative">
                        <Image
                          className="h-11 w-11 sm:h-14 sm:w-14 rounded-full border-2 border-white/10 ring-2 ring-white/5 object-cover"
                          src={review.img}
                          alt={`${review.name} avatar`}
                          width={56}
                          height={56}
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full bg-green-500 border-2 border-black" />
                      </div>
                      <div>
                        <div className="text-sm sm:text-base font-semibold text-white tracking-tight">
                          {review.name}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 font-medium">
                          {review.username}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-light">
                      &ldquo;{review.body}&rdquo;
                    </p>
                  </div>
                ))}
              </Marquee>

              <Marquee reverse pauseOnHover repeat={6} className="[--duration:60s] py-2 sm:py-4">
                {testimonials.slice().reverse().map((review, idx) => (
                  <div
                    key={idx}
                    className="mx-2 sm:mx-4 w-72 sm:w-80 md:w-96 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 sm:p-7 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] hover:shadow-[0_12px_48px_0_rgba(0,0,0,0.6)] transition-all duration-500 hover:border-white/20 hover:bg-white/[0.05] hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
                      <div className="relative">
                        <Image
                          className="h-11 w-11 sm:h-14 sm:w-14 rounded-full border-2 border-white/10 ring-2 ring-white/5 object-cover"
                          src={review.img}
                          alt={`${review.name} avatar`}
                          width={56}
                          height={56}
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full bg-green-500 border-2 border-black" />
                      </div>
                      <div>
                        <div className="text-sm sm:text-base font-semibold text-white tracking-tight">
                          {review.name}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 font-medium">
                          {review.username}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-light">
                      &ldquo;{review.body}&rdquo;
                    </p>
                  </div>
                ))}
              </Marquee>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 overflow-x-hidden">
          <div className="mx-auto max-w-7xl w-full">
            <div className="text-center mb-12 sm:mb-16 px-4">
              <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl xl:text-5xl text-white mb-4 sm:mb-6">
                Simple, transparent pricing
              </h2>
              <p className="text-base sm:text-lg text-gray-400 leading-relaxed max-w-3xl mx-auto">
                Choose the perfect plan for your needs. All plans include a 14-day free trial.
              </p>
            </div>
            
            <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 max-w-7xl mx-auto w-full">
              {pricingTiers.map((tier, i) => {
                const Icon = tier.icon
                const button = (
                  <Button
                    size="lg"
                    className={cn(
                      "relative z-10 w-full rounded-full text-sm sm:text-base py-2.5 sm:py-3 transition-colors duration-200",
                      tier.popular
                        ? "bg-white text-black hover:bg-slate-200"
                        : "border-white/20 text-white hover:border-white/40 hover:bg-white/10"
                    )}
                    variant={tier.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link href="/dashboard">{tier.cta}</Link>
                  </Button>
                )

                return (
                  <div
                    key={i}
                    className={cn(
                      "relative flex h-full flex-col rounded-[32px] border border-white/10 bg-white/[0.02] p-6 sm:p-8 md:p-10 transition-all duration-300 hover:-translate-y-2",
                      tier.popular
                        ? "border-white/40 bg-white/[0.06] shadow-[0_24px_80px_-24px_rgba(99,102,241,0.6)] hover:border-white/60"
                        : "hover:border-white/20 hover:bg-white/[0.04]"
                    )}
                  >
                    {tier.popular && (
                      <div className="absolute -top-5 sm:-top-6 left-1/2 -translate-x-1/2 w-max">
                        <div className="relative inline-flex rounded-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 p-[1.5px] shadow-[0_18px_48px_-18px_rgba(76,29,149,0.7)]">
                          <div className="absolute inset-0 rounded-full bg-white/20 blur-md" />
                          <span className="relative inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-black/85 px-3 sm:px-4 py-1 text-[0.6rem] sm:text-[0.65rem] font-semibold uppercase tracking-[0.15em] sm:tracking-[0.18em] text-white whitespace-nowrap">
                            <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-200 flex-shrink-0" />
                            <span>{tier.discount}</span>
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="mb-6 sm:mb-8 flex flex-col">
                      {tier.earlyBird && (
                        <div className="mb-4 sm:mb-5 inline-flex items-center gap-1.5 sm:gap-2 self-start rounded-full bg-white text-black px-2.5 sm:px-3 py-1.5 text-[0.6rem] sm:text-[0.625rem] font-bold uppercase tracking-[0.12em] sm:tracking-[0.15em] shadow-[0_2px_8px_rgba(255,255,255,0.15)] border border-white/20">
                          <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                          <span className="whitespace-nowrap">Early Bird · 100% OFF</span>
                        </div>
                      )}
                      <div
                        className={cn(
                          "mb-4 sm:mb-6 inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl sm:rounded-2xl border border-white/10 text-white/80 transition-colors duration-300",
                          tier.popular ? "bg-white text-black" : "bg-white/5"
                        )}
                      >
                        <Icon className="h-6 w-6 sm:h-8 sm:w-8" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-white">{tier.name}</h3>
                      <div className="mt-3 sm:mt-4 flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">{tier.price}</span>
                        {tier.period && <span className="text-xs sm:text-sm uppercase tracking-wide text-gray-500">/ {tier.period}</span>}
                      </div>
                      <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-400 leading-relaxed">
                        {tier.description}
                      </p>
                    </div>

                    <ul className="mb-8 sm:mb-10 space-y-3 sm:space-y-4 text-xs sm:text-sm text-gray-300">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 sm:gap-3">
                          <Check className="mt-0.5 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-green-400" />
                          <span className="leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto">
                      {tier.note && (
                        <p className="mb-3 sm:mb-4 text-[0.6rem] sm:text-[0.65rem] font-semibold uppercase tracking-[0.25em] sm:tracking-[0.3em] text-white/60">
                          {tier.note}
                        </p>
                      )}
                      {tier.popular ? (
                        <div className="relative isolate rounded-full p-[1.5px]">
                          <GlowingEffect
                            spread={40}
                            glow
                            disabled={false}
                            proximity={64}
                            inactiveZone={0.01}
                            borderWidth={1.5}
                            className="rounded-full"
                          />
                          {button}
                        </div>
                      ) : (
                        button
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16 lg:py-20 xl:py-32 overflow-x-hidden">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 w-full">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-black via-black to-gray-900 border border-white/10 shadow-[0_20px_80px_-20px_rgba(99,102,241,0.3)]">
              <div className="absolute inset-0 h-full w-full opacity-40">
                <Meteors number={12} color="white" />
              </div>
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-blue-600/5 via-transparent to-transparent" />
              
              <div className="relative z-10 p-8 sm:p-12 lg:p-16 xl:p-20 text-center flex flex-col items-center">
                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl xl:text-5xl leading-tight max-w-3xl">
                  Ready to Transform Your Study Habits?
                </h2>
                
                <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg lg:text-xl text-gray-300 leading-relaxed font-light">
                  Join thousands of students who are already improving their
                  academic performance with StudyFlow.
                </p>
                
                <div className="mt-8 sm:mt-10 lg:mt-12 flex flex-col sm:flex-row gap-4 items-center justify-center">
                  <Link href="/dashboard">
                    <InteractiveHoverButton className="rounded-full bg-amber-500 hover:bg-blue-600 text-white border-amber-500 hover:border-blue-600 text-base sm:text-lg py-3 sm:py-4 px-8 sm:px-10 font-semibold transition-all duration-300">
                      Start Your Journey
                    </InteractiveHoverButton>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
        </main>

        <footer className="relative border-t bg-[#0a0a0a]/80 backdrop-blur-sm border-white/5 w-full">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
              <p className="text-sm text-gray-400">
                © 2025 StudyFlow. All rights reserved.
              </p>
              <Link
                href={"https://www.study-flow.tech/#"}
                className="text-sm text-gray-400 underline hover:text-white transition-colors"
                target="_blank"
              >
                Learn More
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
