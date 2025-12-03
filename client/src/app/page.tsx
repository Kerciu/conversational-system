import Link from "next/link"
import { Sparkles, ArrowRight, Brain, Code, BarChart3, Zap, Shield, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AmbientOrbs } from "@/components/ui/ambient-orbs"

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <AmbientOrbs variant="hero" />

      {/* Header */}
      <header className="relative z-10 p-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative">
            <div className="absolute -inset-2 rounded-full bg-primary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <span className="text-xl font-semibold text-foreground">Decisio.ai</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/auth/login">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Sign in
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button className="glow-primary btn-glow bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground border-0">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 py-20 md:py-28">
        <div className="max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/60 border border-border/60 backdrop-blur-sm text-sm text-muted-foreground mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            AI-Powered Decision Support
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-semibold text-foreground leading-[1.1] text-balance mb-6">
            Transform decisions into{" "}
            <span className="relative inline-block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-cyan-400">
                mathematical models
              </span>
              <span className="absolute -bottom-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 text-pretty">
            Describe your decision problem in natural language. Our AI generates mathematical models and executable code
            to solve complex optimization challenges automatically.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register">
              <Button
                size="lg"
                className="glow-primary btn-glow bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground px-8 h-12 text-base border-0"
              >
                Start for Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-5 mt-28 max-w-5xl w-full">
          {[
            {
              icon: Brain,
              title: "Natural Language Input",
              description: "Describe your problem in plain English. No technical expertise required.",
              gradient: "from-violet-500/10 to-purple-500/5",
            },
            {
              icon: Code,
              title: "Auto-Generated Code",
              description: "Get executable optimization code ready to run in seconds.",
              gradient: "from-blue-500/10 to-cyan-500/5",
            },
            {
              icon: BarChart3,
              title: "Visual Results",
              description: "Understand solutions through interactive visualizations.",
              gradient: "from-cyan-500/10 to-teal-500/5",
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 gradient-border"
            >
              <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />

              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 text-primary mb-4 group-hover:scale-105 transition-transform">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Secondary Features */}
        <div className="flex flex-wrap justify-center gap-8 mt-20 max-w-3xl">
          {[
            { icon: Zap, label: "Real-time Processing" },
            { icon: Shield, label: "Enterprise Security" },
            { icon: Globe, label: "Multi-language Support" },
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-muted-foreground">
              <item.icon className="h-4 w-4 text-primary/70" />
              <span className="text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center border-t border-border/50 mt-12">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Decisio.ai. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
