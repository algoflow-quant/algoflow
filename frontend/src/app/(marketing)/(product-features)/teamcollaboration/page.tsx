import ProductLayout from "@/components/layout/ProductLayout"
import { Zap } from "lucide-react"

export default function TeamCollaborationPage() {
  return (
    <ProductLayout
      icon={<Zap size={32} />}
      iconLabel="Team Collaboration"
      title={<>Build Better Strategies <br/>Together</>}
      description={<>Work together with your team to develop, test, and <br/>deploy trading strategies. <br/><br/>Share research, review code, and manage permissions <br/>all in one collaborative platform.</>}
    />
  )
}
