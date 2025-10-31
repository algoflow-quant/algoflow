'use client'

import ProductLayout from "@/components/layout/ProductLayout"
import { AnimatedLineChart } from "@/components/ui/line-chart"
import { DataCard, type DataFeedData } from "@/components/ui/data-card"
import { Database, TrendingUp, Zap } from "lucide-react"

// Data feeds
const dataFeeds: DataFeedData[] = [
  { name: 'NYSE Market Data', description: 'Real-time equity prices', status: 'online', latency: '2ms', uptime: '99.99%' },
  { name: 'NASDAQ Feed', description: 'Level 2 order book data', status: 'online', latency: '3ms', uptime: '99.98%' },
  { name: 'Historical Database', description: '20+ years of tick data', status: 'syncing', latency: '5ms', uptime: '99.95%' },
]

export default function AlgoFlowDataPage() {
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
      icon={<Database size={32} />}
      iconLabel="AlgoFlow Data"
      title={<>AlgoFlow Data Built <br/>for Scale</>}
      description={<>Our proprietary data infrastructure delivers <br/>institutional-quality market data with unmatched <br/>reliability and performance. <br/><br/>Purpose-built for quantitative trading at any scale.</>}
      features={features}
    >
      <div className="relative w-full h-[500px]">
        {/*Green chart*/}
        <div className="absolute top-0 right-0 w-[90%] z-10">
          <AnimatedLineChart
            pathData="M0,120 L30,110 L60,115 L90,105 L120,100 L150,95 L180,90 L210,85 L240,80 L270,75 L300,70 L330,65 L360,60 L390,55"
            color="rgb(34, 197, 94)"
            label="NYSE - S&P 500 Index"
            animationDelay={0.3}
            animationDuration={2.5}
          />
        </div>

        {/*Data cards*/}
        <div className="absolute bottom-0 left-0 w-[85%] z-20 space-y-3">
          {dataFeeds.map((feed, index) => (
            <DataCard key={feed.name} feed={feed} animated delay={500 + index * 200} />
          ))}
        </div>

        {/*Orange chart*/}
        <div className="absolute top-1/2 right-[-65%] -translate-y-1/2 w-[95%] z-30">
          <AnimatedLineChart
            pathData="M0,140 L30,135 L60,145 L90,130 L120,125 L150,135 L180,120 L210,115 L240,110 L270,105 L300,100 L330,95 L360,90 L390,85"
            color="rgb(251, 146, 60)"
            label="Crypto Market Feed - BTC"
            viewBoxHeight={150}
            svgHeight="200px"
            animationDelay={0.7}
            animationDuration={2.2}
            strokeWidth={2}
            labelSize="md"
          />
        </div>
      </div>
    </ProductLayout>
  )
}
