import ProductLayout from "@/components/layout/ProductLayout"
import { Database } from "lucide-react"

export default function AlgoFlowDataPage() {
  return (
    <ProductLayout
      icon={<Database size={32} />}
      iconLabel="AlgoFlow Data"
      title={<>AlgoFlow Data Built <br/>for Scale</>}
      description={<>Our proprietary data infrastructure delivers <br/>institutional-quality market data with unmatched <br/>reliability and performance. <br/><br/>Purpose-built for quantitative trading at any scale.</>}
    />
  )
}
