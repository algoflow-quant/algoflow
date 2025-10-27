import Header from "@/components/layout/public_header/Header"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      <main className="pt-24">{children}</main>
    </>
  )
}