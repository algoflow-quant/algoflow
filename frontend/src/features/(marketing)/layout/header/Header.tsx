import Logo from '@/components/shared/Logo'
import AuthButtons from './AuthButtons'
import Navbar from './Navbar'
import HeaderWrapper from './HeaderWrapper'

export default async function Header() {
  return (
    <HeaderWrapper>
      {/* Logo */}
      <div className="flex items-center">
        <Logo />
      </div>

      {/* Center Nav (Desktop) */}
      <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2">
        <Navbar />
      </div>

      {/* Auth Buttons - pushed to the right */}
      <AuthButtons />
    </HeaderWrapper>
  )
}
