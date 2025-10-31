import ProductLayout from "@/components/layout/ProductLayout"
import { Terminal, TypingAnimation, AnimatedSpan } from "@/components/ui/terminal"
import { LineChart, TrendingUp, Database, Zap } from "lucide-react"

export default function BacktestingPage() {
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
      icon={<LineChart size={32} />}
      iconLabel="Backtesting"
      title={<>Test Your Strategies Before<br/>Risking Real Capital</>}
      description={<>Run comprehensive backtests on historical data with <br/> institutional-grade accuracy.<br/><br/>Simulate your trading strategies across years of market <br/> data to validate performance and optimize parameters <br/>before going live.</>}
      features={features}
    >
      <div className="relative w-full h-[500px]">
        {/*Most back terminal*/}
        <div className="absolute top-0 right-0 w-[90%] z-10">
          <Terminal>
            <TypingAnimation>&gt; algoflow backtest --strategy momentum</TypingAnimation>
            <AnimatedSpan className="text-green-500" delay={2000}>
              ✔ Loading historical data...
            </AnimatedSpan>
            <AnimatedSpan className="text-green-500" delay={2500}>
              ✔ Initializing strategy parameters
            </AnimatedSpan>
            <AnimatedSpan className="text-green-500" delay={3000}>
              ✔ Running backtest simulation
            </AnimatedSpan>
            <AnimatedSpan className="text-green-500" delay={3500}>
              ✔ Calculating performance metrics
            </AnimatedSpan>
            <AnimatedSpan className="text-blue-500" delay={4000}>
              <div>ℹ Backtest Results:</div>
              <div className="pl-4 mt-2">
                <div>Total Return: +47.3%</div>
                <div>Sharpe Ratio: 1.82</div>
                <div>Max Drawdown: -12.4%</div>
                <div>Win Rate: 58.3%</div>
              </div>
            </AnimatedSpan>
            <TypingAnimation delay={5000} className="text-muted-foreground">
              Success! Backtest completed in 2.4s
            </TypingAnimation>
          </Terminal>
        </div>

        {/*Most left terminal*/}
        <div className="absolute bottom-0 left-0 w-[85%] z-20">
          <Terminal>
            <TypingAnimation delay={1000}>&gt; algoflow optimize --param sharpe</TypingAnimation>
            <AnimatedSpan className="text-green-500" delay={3000}>
              ✔ Analyzing parameter space
            </AnimatedSpan>
            <AnimatedSpan className="text-green-500" delay={3500}>
              ✔ Testing 500 combinations
            </AnimatedSpan>
            <AnimatedSpan className="text-blue-500" delay={4500}>
              <div>ℹ Optimal Parameters Found:</div>
              <div className="pl-4 mt-2">
                <div>Period: 14 days</div>
                <div>Threshold: 0.65</div>
                <div>Stop Loss: 2.5%</div>
              </div>
            </AnimatedSpan>
          </Terminal>
        </div>

        {/*Most right terminal*/}
        <div className="absolute top-1/2 right-[-65%] -translate-y-1/2 w-[95%] z-30">
          <Terminal className="min-h-[350px]">
            <TypingAnimation delay={500}>&gt; algoflow analyze --metrics all</TypingAnimation>
            <AnimatedSpan className="text-green-500" delay={2500}>
              ✔ Loading strategy data
            </AnimatedSpan>
            <AnimatedSpan className="text-green-500" delay={2700}>
              ✔ Computing statistics
            </AnimatedSpan>
            <AnimatedSpan className="text-green-500" delay={2900}>
              ✔ Calculating correlation matrix
            </AnimatedSpan>
            <AnimatedSpan className="text-green-500" delay={3100}>
              ✔ Analyzing risk metrics
            </AnimatedSpan>
            <AnimatedSpan className="text-green-500" delay={3300}>
              ✔ Generating performance reports
            </AnimatedSpan>
            <AnimatedSpan className="text-green-500" delay={3500}>
              ✔ Creating visualizations
            </AnimatedSpan>
            <AnimatedSpan className="text-blue-500" delay={3800}>
              <div>ℹ Analysis Summary:</div>
              <div className="pl-4 mt-2">
                <div>Strategies Analyzed: 12</div>
                <div>Time Period: 5 years</div>
                <div>Data Points: 1.2M</div>
                <div>Report Generated: analysis_2024.pdf</div>
              </div>
            </AnimatedSpan>
            <TypingAnimation delay={4500} className="text-muted-foreground">
              Analysis complete. Results saved to /reports
            </TypingAnimation>
          </Terminal>
        </div>
      </div>
    </ProductLayout>
  )
}
