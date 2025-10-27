import Header from "@/components/layout/public_header/Header"
import Footer from "@/components/layout/footer"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      <main className="pt-24">{children}</main>
      <Footer />
    </>
  )
}