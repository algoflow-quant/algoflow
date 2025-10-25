import Logo from '@/components/shared/Logo'
import AuthButtons from './AuthButtons'
import Navbar from './Navbar'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-16 items-center justify-between">

          {/* Wrapper for logo & navbar*/}
          <div className="flex gap-10">
            {/* Logo */}
            <div className="flex items-center">
              <Logo />
            </div>

            {/* Center Nav (Desktop) */}
            <div className="hidden md:flex">
              <Navbar />
            </div>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-4">
            <AuthButtons />
          </div>
        </div>
      </div>
    </header>
  );
}