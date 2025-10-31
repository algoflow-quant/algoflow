'use client'

import ProductLayout from "@/components/layout/ProductLayout"
import { AnimatedLineChart } from "@/components/ui/line-chart"
import { Terminal, AnimatedSpan } from "@/components/ui/terminal"
import { Code2, TrendingUp, Database, Zap } from "lucide-react"

export default function QuantitativeDataPage() {
  const features = [
    {
      icon: <TrendingUp className="size-6" aria-hidden />,
      title: "Historical Tick Data",
      description: "Access years of high-frequency tick-level data across thousands of instruments for precise backtesting."
    },
    {
      icon: <Database className="size-6" aria-hidden />,
      title: "Alternative Datasets",
      description: "Leverage sentiment data, satellite imagery, and other alternative data sources to gain unique market insights."
    },
    {
      icon: <Zap className="size-6" aria-hidden />,
      title: "Real-Time Feeds",
      description: "Institutional-grade real-time market data with ultra-low latency for live trading and analysis."
    }
  ]

  return (
    <ProductLayout
      icon={<Code2 size={32} />}
      iconLabel="Quantitative IDE"
      title={<>Premium Market Data <br/> at Your Fingertips</>}
      description={<>Access the same high-quality financial data used <br/>by top hedge funds. <br/><br/>From historical price data to alternative datasets, get <br/>the information you need to build data-driven strategies.</>}
      features={features}
    >
      <div className="relative w-full h-[600px]">
        {/*Terminal*/}
        <div className="absolute top-0 left-[15%] w-[58%] h-[85%] z-10">
          <Terminal className="h-full bg-slate-950 border-slate-800">
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-3">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-slate-400 text-xs ml-2">strategy.py</span>
              </div>

              {/*Code lines & colors/animation*/}
              <AnimatedSpan delay={200}>
                <span className="text-purple-400">import</span>{" "}
                <span className="text-blue-400">algoflow</span>{" "}
                <span className="text-purple-400">as</span>{" "}
                <span className="text-blue-400">af</span>
              </AnimatedSpan>

              <AnimatedSpan delay={400}>
                <span className="text-purple-400">import</span>{" "}
                <span className="text-blue-400">pandas</span>{" "}
                <span className="text-purple-400">as</span>{" "}
                <span className="text-blue-400">pd</span>
              </AnimatedSpan>

              <AnimatedSpan delay={600} className="mt-4">
                <span className="text-slate-500"># Access premium market data</span>
              </AnimatedSpan>

              <AnimatedSpan delay={800}>
                <span className="text-blue-300">equities</span>{" "}
                <span className="text-white">=</span>{" "}
                <span className="text-blue-400">af</span>
                <span className="text-white">.</span>
                <span className="text-yellow-300">get_historical</span>
                <span className="text-white">(</span>
              </AnimatedSpan>

              <AnimatedSpan delay={1000}>
                <span className="ml-4 text-slate-400">symbols</span>
                <span className="text-white">=</span>
                <span className="text-green-400">["AAPL", "MSFT", "GOOGL"]</span>
                <span className="text-white">,</span>
              </AnimatedSpan>

              <AnimatedSpan delay={1200}>
                <span className="ml-4 text-slate-400">start_date</span>
                <span className="text-white">=</span>
                <span className="text-green-400">"2015-01-01"</span>
                <span className="text-white">,</span>
              </AnimatedSpan>

              <AnimatedSpan delay={1400}>
                <span className="ml-4 text-slate-400">frequency</span>
                <span className="text-white">=</span>
                <span className="text-green-400">"tick"</span>
              </AnimatedSpan>

              <AnimatedSpan delay={1600}>
                <span className="text-white">)</span>
              </AnimatedSpan>

              <AnimatedSpan delay={1800} className="mt-4">
                <span className="text-slate-500"># Access alternative datasets</span>
              </AnimatedSpan>

              <AnimatedSpan delay={2000}>
                <span className="text-blue-300">sentiment</span>{" "}
                <span className="text-white">=</span>{" "}
                <span className="text-blue-400">af</span>
                <span className="text-white">.</span>
                <span className="text-yellow-300">get_sentiment_data</span>
                <span className="text-white">()</span>
              </AnimatedSpan>

              <AnimatedSpan delay={2200} className="mt-4">
                <span className="text-green-500">✓</span>{" "}
                <span className="text-slate-400">Premium data ready: 2.4M ticks</span>
              </AnimatedSpan>
            </div>
          </Terminal>
        </div>

        {/*Small green chart*/}
        <div className="absolute top-[-30px] right-[-10%] w-[58%] z-20 opacity-0 animate-fade-in" style={{ animationDelay: '2.4s', animationFillMode: 'forwards' }}>
          <AnimatedLineChart
            pathData="M0,80 L40,75 L80,85 L120,70 L160,65 L200,75 L240,60 L280,55 L320,50 L360,45 L400,40"
            color="rgb(34, 197, 94)"
            label="Historical Tick Data - AAPL"
            viewBoxHeight={110}
            svgHeight="180px"
            animationDelay={2.6}
            animationDuration={1.8}
            strokeWidth={2.5}
            labelSize="md"
          />
        </div>

        {/*Large blue chart*/}
        <div className="absolute bottom-[-50px] left-0 w-[58%] z-30 opacity-0 animate-fade-in" style={{ animationDelay: '2.6s', animationFillMode: 'forwards' }}>
          <AnimatedLineChart
            pathData="M0,120 L40,110 L80,125 L120,100 L160,95 L200,110 L240,90 L280,85 L320,95 L360,75 L400,70"
            color="rgb(59, 130, 246)"
            label="Institutional-Grade Price Feed"
            viewBoxHeight={150}
            svgHeight="220px"
            animationDelay={2.8}
            animationDuration={2}
            strokeWidth={3}
            labelSize="lg"
          />
        </div>

        {/*Small purple chart*/}
        <div className="absolute top-[38%] right-[-18%] w-[52%] z-20 opacity-0 animate-fade-in" style={{ animationDelay: '2.8s', animationFillMode: 'forwards' }}>
          <AnimatedLineChart
            pathData="M0,90 L50,85 L100,95 L150,80 L200,75 L250,70 L300,65 L350,60 L400,55"
            color="rgb(168, 85, 247)"
            label="Alternative Data - Sentiment"
            viewBoxHeight={120}
            svgHeight="190px"
            animationDelay={3.0}
            animationDuration={1.8}
            strokeWidth={2.5}
            labelSize="md"
            padding="p-5"
          />
        </div>
      </div>
    </ProductLayout>
  )
}
