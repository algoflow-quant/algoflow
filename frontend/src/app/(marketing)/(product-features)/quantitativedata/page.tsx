import ProductLayout from "@/components/layout/ProductLayout"
import { Code2 } from "lucide-react"

export default function QuantitativeDataPage() {
  return (
    <ProductLayout
      icon={<Code2 size={32} />}
      iconLabel="Quantitative IDE"
      title={<>Premium Market Data <br/> at Your Fingertips</>}
      description={<>Access the same high-quality financial data used <br/>by top hedge funds. <br/><br/>From historical price data to alternative datasets, get <br/>the information you need to build data-driven strategies.</>}
    />
  )
}
