// Main navigation bar component
// Refactored to use data-driven approach for easier maintenance

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

// Shadcn UI components
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

// Custom components
import {
  CustomNavbarDropdownButton,
  CustomNavbarDropdownButtonAlternative,
  NavIcon
} from './NavbarComponents';

// Menu data configuration
import {
  productSections,
  productShowcase,
  featureSections,
  simpleLinks,
  type NavSection,
  type NavMenuItem
} from './navbarData';

// Renders a single navigation menu item
// Automatically handles icon sizing and wrapping
function renderMenuItem(item: NavMenuItem, useAlternative: boolean = false) {
  const ButtonComponent = useAlternative
    ? CustomNavbarDropdownButtonAlternative
    : CustomNavbarDropdownButton;

  return (
    <ButtonComponent
      key={item.href + item.title}
      href={item.href}
      icon={<NavIcon size={item.iconSize}>{item.icon}</NavIcon>}
      title={item.title}
      description={item.description}
    />
  );
}

// Renders a dropdown section with optional header and divider
// Handles both Product and Features dropdown layouts
function renderSection(section: NavSection, useAlternative: boolean = false) {
  const { title, items, hasDivider, className } = section;

  // Split items if divider is needed (last item separated)
  const mainItems = hasDivider ? items.slice(0, -1) : items;
  const lastItem = hasDivider ? items[items.length - 1] : null;

  return (
    <div className={className} key={title || 'section'}>
      {/* Section header (optional) */}
      {title && (
        <p className="text-muted-foreground font-normal text-xs mb-1">
          {title}
        </p>
      )}

      {/* Main items */}
      {mainItems.map(item => renderMenuItem(item, useAlternative))}

      {/* Divider and last item (if applicable) */}
      {hasDivider && lastItem && (
        <>
          <Separator />
          {renderMenuItem(lastItem, useAlternative)}
        </>
      )}
    </div>
  );
}

export default function Navbar() {
  return (
    <NavigationMenu>
      <NavigationMenuList className="flex gap-1">

        {/* Product Dropdown */}
        <NavigationMenuItem>
          <NavigationMenuTrigger>Product</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="flex p-3 gap-4 w-[1000px]">

              {/* Product sections - data-driven */}
              {productSections.map((section, index) =>
                renderSection(section, index === 1) // Use alternative style for section 2
              )}

              {/* Product Showcase (Strategy Lab) */}
              <div className="flex-[3] flex flex-col min-h-[200px] px-6 border-l">
                <p className="text-muted-foreground font-normal text-xs mb-4">
                  {productShowcase.title}
                </p>

                {/* Showcase image */}
                <div className="flex justify-center mb-3">
                  <Image
                    src={productShowcase.image.src}
                    alt={productShowcase.image.alt}
                    width={productShowcase.image.width}
                    height={productShowcase.image.height}
                    className="rounded-md border"
                  />
                </div>

                {/* Showcase description */}
                <p className="text-sm text-muted-foreground leading-relaxed text-center mb-4">
                  {productShowcase.description}
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-row gap-3 justify-center">
                  <Button size="lg" className="h-7">
                    {productShowcase.buttons.primary.text}
                  </Button>
                  <Button size="lg" variant="outline" className="h-7">
                    {productShowcase.buttons.secondary.text}
                  </Button>
                </div>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Features Dropdown */}
        <NavigationMenuItem>
          <NavigationMenuTrigger>Features</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="flex gap-4 p-3 w-[1010px]">
              {/* All feature sections - data-driven with alternative style */}
              {featureSections.map(section => renderSection(section, true))}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Simple navigation links - data-driven */}
        {simpleLinks.map(link => (
          <NavigationMenuItem key={link.href}>
            <NavigationMenuLink asChild>
              <Link href={link.href} className="font-medium px-4">
                {link.label}
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  )
}
