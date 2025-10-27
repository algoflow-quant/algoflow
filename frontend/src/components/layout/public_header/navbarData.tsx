// Navigation menu data configuration
// This file contains all menu items, icons, and structure for the navbar dropdowns

import { ReactNode } from 'react';
import { GrTest, GrMultiple } from "react-icons/gr";
import { RiStockFill, RiTeamFill } from "react-icons/ri";
import { FaDatabase, FaUserLock } from "react-icons/fa";
import { IoSparkles, IoLibrarySharp, IoTerminal } from "react-icons/io5";
import { IoIosWarning, IoMdGitBranch } from "react-icons/io";
import { GoContainer } from "react-icons/go";
import { PiGearFineFill } from "react-icons/pi";
import { TbBrowserShare } from "react-icons/tb";
import { VscVscode, VscDebugAltSmall } from "react-icons/vsc";
import { AiOutlineStock } from "react-icons/ai";
import { HiCursorArrowRipple } from "react-icons/hi2";
import { FiShare2 } from "react-icons/fi";
import { BsGpuCard } from "react-icons/bs";

// Type definitions for menu structure
export interface NavMenuItem {
  href: string;
  icon: ReactNode;
  iconSize?: { width: string; height: string };
  title: string;
  description: string;
}

export interface NavSection {
  title?: string; // Optional section header
  items: NavMenuItem[];
  hasDivider?: boolean; // Show divider before last item
  className?: string; // Custom section styling
}

export interface ProductShowcase {
  title: string;
  image: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  description: string;
  buttons: {
    primary: { text: string; href?: string };
    secondary: { text: string; href?: string };
  };
}

// Product dropdown configuration
export const productSections: NavSection[] = [
  // Section 1: Main Products
  {
    items: [
      {
        href: "/lab/strategy-builder",
        icon: <VscVscode />,
        iconSize: { width: '20px', height: '20px' },
        title: "Quantitative IDE",
        description: "Full-featured development tools"
      },
      {
        href: "/backtesting",
        icon: <RiStockFill />,
        iconSize: { width: '20px', height: '20px' },
        title: "Backtesting",
        description: "Test strategies on history"
      },
      {
        href: "/backtesting",
        icon: <GrTest />,
        title: "Research",
        description: "Jupyter notebook environment"
      },
      {
        href: "/backtesting",
        icon: <FaDatabase />,
        title: "Algoflow Data",
        description: "Market and alternative data"
      },
      {
        href: "/backtesting",
        icon: <RiTeamFill />,
        title: "Team Collaboration",
        description: "Code together in real-time"
      }
    ],
    className: "flex-[2] flex gap-1 flex-col min-h-[200px]"
  },
  // Section 2: Main Features
  {
    title: "FEATURES",
    items: [
      {
        href: "/algo-library",
        icon: <IoLibrarySharp />,
        iconSize: { width: '15px', height: '15px' },
        title: "Algorithm Library",
        description: "1000+ strategy templates"
      },
      {
        href: "/features/ai-agent",
        icon: <IoSparkles />,
        iconSize: { width: '15px', height: '15px' },
        title: "AI-Powered Agent",
        description: "Intelligent code assistant"
      },
      {
        href: "/optimization",
        icon: <PiGearFineFill />,
        iconSize: { width: '15px', height: '15px' },
        title: "Optimization Engine",
        description: "Auto-tune parameters"
      },
      {
        href: "/features",
        icon: <TbBrowserShare />,
        iconSize: { width: '15px', height: '15px' },
        title: "Explore all features",
        description: "View complete feature list"
      }
    ],
    hasDivider: true, // Shows divider before last item
    className: "flex-[2] flex gap-2 flex-col min-h-[200px]"
  }
];

// Product showcase (right side of product dropdown)
export const productShowcase: ProductShowcase = {
  title: "STRATEGY LAB",
  image: {
    src: "/images/header/strategy-preview.png",
    alt: "Strategy Lab Preview",
    width: 300,
    height: 180
  },
  description: "Build, test, and deploy quantitative trading strategies with our integrated development environment.",
  buttons: {
    primary: { text: "Start Building" },
    secondary: { text: "View Pricing" }
  }
};

// Features dropdown configuration
export const featureSections: NavSection[] = [
  // Section 1: Development Tools
  {
    title: "DEVELOPMENT TOOLS",
    items: [
      {
        href: "/features/ai-agent",
        icon: <IoSparkles />,
        iconSize: { width: '15px', height: '15px' },
        title: "AI-Powered Agent",
        description: "Intelligent code assistant"
      },
      {
        href: "/features/debugging",
        icon: <VscDebugAltSmall />,
        iconSize: { width: '15px', height: '15px' },
        title: "Integrated Debugging",
        description: "Breakpoints & step-through"
      },
      {
        href: "/features/git",
        icon: <IoMdGitBranch />,
        iconSize: { width: '15px', height: '15px' },
        title: "Version Control",
        description: "Git integration built-in"
      },
      {
        href: "/features/linting",
        icon: <IoTerminal />,
        iconSize: { width: '15px', height: '15px' },
        title: "Real-time Linting",
        description: "Catch errors as you type"
      },
      {
        href: "/features/dev-tools",
        icon: <TbBrowserShare />,
        iconSize: { width: '15px', height: '15px' },
        title: "View more dev tools",
        description: "See all development features"
      }
    ],
    hasDivider: true,
    className: "flex-[1] flex flex-col gap-2 min-h-[200px]"
  },
  // Section 2: Quantitative Analysis
  {
    title: "QUANTITATIVE ANALYSIS",
    items: [
      {
        href: "/features/backtesting",
        icon: <RiStockFill />,
        iconSize: { width: '15px', height: '15px' },
        title: "Backtesting Framework",
        description: "Test on decades of data"
      },
      {
        href: "/features/optimization",
        icon: <PiGearFineFill />,
        iconSize: { width: '15px', height: '15px' },
        title: "Optimization Engine",
        description: "Auto-tune parameters"
      },
      {
        href: "/algo-library",
        icon: <IoLibrarySharp />,
        iconSize: { width: '15px', height: '15px' },
        title: "Algorithm Library",
        description: "1000+ strategy templates"
      },
      {
        href: "/features/market-data",
        icon: <AiOutlineStock />,
        iconSize: { width: '15px', height: '15px' },
        title: "Market Data Integration",
        description: "Real-time & historical feeds"
      },
      {
        href: "/features/quant",
        icon: <TbBrowserShare />,
        iconSize: { width: '15px', height: '15px' },
        title: "View more quant tools",
        description: "Advanced analytics features"
      }
    ],
    hasDivider: true,
    className: "flex-[1] flex flex-col gap-2 min-h-[270px]"
  },
  // Section 3: Collaboration
  {
    title: "COLLABORATION & TEAM",
    items: [
      {
        href: "/features/live-cursors",
        icon: <HiCursorArrowRipple />,
        iconSize: { width: '15px', height: '15px' },
        title: "Live Cursors & Presence",
        description: "See teammates in real-time"
      },
      {
        href: "/features/kernel-sharing",
        icon: <FiShare2 />,
        iconSize: { width: '15px', height: '15px' },
        title: "Shared Jupyter Kernels",
        description: "Research in realtime"
      },
      {
        href: "/features/resource-limits",
        icon: <IoIosWarning />,
        iconSize: { width: '15px', height: '15px' },
        title: "Resource Quotas",
        description: "Set per-user compute limits"
      },
      {
        href: "/features/permissions",
        icon: <FaUserLock />,
        iconSize: { width: '15px', height: '15px' },
        title: "Role-based Permissions",
        description: "Granular access control"
      },
      {
        href: "/features/collaboration",
        icon: <TbBrowserShare />,
        iconSize: { width: '15px', height: '15px' },
        title: "View more collab features",
        description: "Team collaboration tools"
      }
    ],
    hasDivider: true,
    className: "flex-[1] flex flex-col gap-2 min-h-[270px]"
  },
  // Section 4: Performance & Scale
  {
    title: "PERFORMANCE & SCALE",
    items: [
      {
        href: "/compute",
        icon: <GoContainer />,
        iconSize: { width: '15px', height: '15px' },
        title: "Compute Resources",
        description: "persistant CPU/GPU containers"
      },
      {
        href: "/features/distributed",
        icon: <GrMultiple />,
        iconSize: { width: '15px', height: '15px' },
        title: "Distributed Processing",
        description: "Parallel backtesting across nodes"
      },
      {
        href: "/features/database-access",
        icon: <FaDatabase />,
        iconSize: { width: '15px', height: '15px' },
        title: "Direct Database Access",
        description: "Lightning-fast data queries"
      },
      {
        href: "/features/resource-limits",
        icon: <BsGpuCard />,
        iconSize: { width: '15px', height: '15px' },
        title: "GPU Acceleration",
        description: "Hardware-accelerated backtests"
      },
      {
        href: "/features/performance",
        icon: <TbBrowserShare />,
        iconSize: { width: '15px', height: '15px' },
        title: "View more infrastructure",
        description: "Performance & scaling features"
      }
    ],
    hasDivider: true,
    className: "flex-[1] flex flex-col gap-2 min-h-[270px]"
  }
];

// Simple navigation links (non-dropdown items)
export const simpleLinks = [
  { href: "/data-store", label: "Data Store" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" }
];
