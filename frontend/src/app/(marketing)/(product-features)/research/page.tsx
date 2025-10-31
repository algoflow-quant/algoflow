'use client'

import ProductLayout from "@/components/layout/ProductLayout"
import { AnimatedLineChart } from "@/components/ui/line-chart"
import { GrTest } from "react-icons/gr"
import { TrendingUp, Database, Zap } from "lucide-react"

export default function ResearchPage() {
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
      icon={<GrTest size={32} />}
      iconLabel="Research"
      title={<>Discover Alpha with <br/>Advanced Analytics</>}
      description={<>Leverage cutting-edge research tools and AI-powered <br/> insights to discover trading opportunities.<br/><br/> Analyze market patterns, test hypotheses, and develop <br/>strategies backed by data science.</>}
      features={features}
    >
      <div className="relative w-full h-[500px]">
        {/*Green chart*/}
        <div className="absolute top-[-30px] right-0 w-[90%] z-40">
          <AnimatedLineChart
            pathData="M0,112.5 L30,100 L60,120 L90,87.5 L120,95 L150,75 L180,80 L210,62.5 L240,70 L270,50 L300,45 L330,37.5 L360,30 L390,25"
            color="rgb(16, 185, 129)"
            label="Portfolio Returns"
            animationDelay={0.5}
            animationDuration={2}
          />
        </div>

        {/*Purple chart*/}
        <div className="absolute bottom-0 left-0 w-[85%] z-20">
          <AnimatedLineChart
            pathData="M0,150 L30,140 L60,155 L90,125 L120,135 L150,110 L180,120 L210,95 L240,105 L270,85 L300,75 L330,60 L360,50 L390,40"
            color="rgb(168, 85, 247)"
            label="Cumulative Alpha"
            viewBoxHeight={200}
            svgHeight="280px"
            animationDelay={0.7}
            animationDuration={2.5}
            strokeWidth={3}
            labelSize="lg"
            padding="p-8"
          />
        </div>

        {/*Blue chart*/}
        <div className="absolute top-[55%] right-[-65%] -translate-y-1/2 w-[95%] z-30">
          <AnimatedLineChart
            pathData="M0,100 L30,95 L60,105 L90,90 L120,85 L150,95 L180,80 L210,75 L240,85 L270,70 L300,65 L330,70 L360,60 L390,55"
            color="rgb(59, 130, 246)"
            label="Sharpe Ratio"
            animationDelay={1}
            animationDuration={2}
          />
        </div>
      </div>
    </ProductLayout>
  )
}
