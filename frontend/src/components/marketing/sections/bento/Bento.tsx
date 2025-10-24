'use client'

import { BentoCard, BentoGrid } from "@/components/ui/bento-grid"
import { Code2, LineChart, Database, BookOpen, Brain, Zap } from "lucide-react"
import { StrategyBuilderAnimation } from "./StrategyBuilderAnimation"
import { BacktesterAnimation } from "./BacktesterAnimation"
import { ResearchAnimation } from "./ResearchAnimation"
import AlgorithmLibraryAnimation from "./AlgorithmLibraryAnimation"
import AIAssistantAnimation from "./AIAssistantAnimation"
import CollaborationAnimation from "./CollaborationAnimation"

const features = [
  {
    Icon: Code2,
    name: "Quantitative IDE",
    description: "Develop and test trading algorithms with our collaborative Python IDE featuring real-time code execution and debugging.",
    href: "/ide",
    cta: "Learn more",
    background: <StrategyBuilderAnimation />,
    className: "lg:row-start-1 lg:row-end-2 lg:col-start-1 lg:col-end-3",
  },
  {
    Icon: LineChart,
    name: "Backtesting",
    description: "Validate strategies against historical data with comprehensive performance metrics and risk analysis.",
    href: "/backtesting",
    cta: "Learn more",
    background: <BacktesterAnimation />,
    className: "lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-2",
  },
  {
    Icon: Database,
    name: "Research",
    description: "Analyze market trends, backtest ideas, and explore trading opportunities with a powerful notebook environment.",
    href: "/research",
    cta: "Learn more",
    background: <ResearchAnimation />,
    className: "lg:col-start-4 lg:col-end-5 lg:row-start-1 lg:row-end-2",
  },
  {
    Icon: BookOpen,
    name: "Algorithm Library",
    description: "Browse and deploy pre-built trading strategies from our curated library of proven algorithms.",
    href: "/library",
    cta: "Learn more",
    background: <AlgorithmLibraryAnimation />,
    className: "lg:col-start-1 lg:col-end-2 lg:row-start-2 lg:row-end-3",
  },
  {
    Icon: Brain,
    name: "AI-Powered Agent",
    description: "Get intelligent code suggestions, strategy optimization, and automated debugging powered by advanced AI.",
    href: "/ai",
    cta: "Learn more",
    background: <AIAssistantAnimation />,
    className: "lg:col-start-2 lg:col-end-3 lg:row-start-2 lg:row-end-3",
  },
  {
    Icon: Zap,
    name: "Team Collaboration",
    description: "Work together with your team in real-time with live cursors, presence tracking, and instant synchronization.",
    href: "/collaboration",
    cta: "Learn more",
    background: <CollaborationAnimation />,
    className: "lg:col-start-3 lg:col-end-5 lg:row-start-2 lg:row-end-3",
  },
]

export default function BentoSection() {
  return (
    <div className="container mx-auto px-4 py-20 max-w-7xl">
      <div className="mb-12 text-center">
        <h2 className="text-4xl font-bold mb-4">Everything you need to build winning strategies</h2>
        <p className="text-xl text-muted-foreground">Right in your browser</p>
      </div>
      <BentoGrid className="lg:grid-rows-2 lg:grid-cols-4 min-h-[850px] h-auto">
        {features.map((feature) => (
          <BentoCard key={feature.name} {...feature} />
        ))}
      </BentoGrid>
    </div>
  )
}
