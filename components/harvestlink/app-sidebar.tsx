'use client'

import {
  ArrowUpRight,
  ClipboardList,
  Leaf,
  ScanLine,
  ShoppingBasket,
  Sprout,
} from 'lucide-react'
import type { AppSection } from '@/lib/harvestlink/types'

type AppSidebarProps = {
  activeSection: AppSection
  onNavigate: (section: AppSection) => void
  activeOrders: number
}

const navigation: { section: AppSection; label: string; icon: typeof Leaf }[] = [
  { section: 'shop', label: 'Discover', icon: ShoppingBasket },
  { section: 'orders', label: 'My orders', icon: ClipboardList },
  { section: 'scan', label: 'Freshness scan', icon: ScanLine },
]

export function AppSidebar({ activeSection, onNavigate, activeOrders }: AppSidebarProps) {
  return (
    <>
      <aside className="app-sidebar" aria-label="Main navigation">
        <button className="brand-lockup" onClick={() => onNavigate('shop')} aria-label="HarvestLink home">
          <span className="brand-mark"><Sprout aria-hidden="true" /></span>
          <span className="brand-name">harvest<span>link</span></span>
        </button>

        <div className="sidebar-section-label">YOUR MARKET</div>
        <nav className="sidebar-nav" aria-label="Your market">
          {navigation.map(({ section, label, icon: Icon }) => (
            <button
              key={section}
              className={`sidebar-link${activeSection === section ? ' is-active' : ''}`}
              onClick={() => onNavigate(section)}
              aria-current={activeSection === section ? 'page' : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
              {section === 'orders' && activeOrders > 0 && <span className="nav-count">{activeOrders}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-section-label sidebar-section-label--lower">GROW WITH US</div>
        <button
          className={`sidebar-link${activeSection === 'farmer' ? ' is-active' : ''}`}
          onClick={() => onNavigate('farmer')}
          aria-current={activeSection === 'farmer' ? 'page' : undefined}
        >
          <Leaf aria-hidden="true" />
          <span>Farmer studio</span>
        </button>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="sidebar-tip-icon"><Sprout aria-hidden="true" /></div>
            <p>Good food travels a little less.</p>
            <button onClick={() => onNavigate('shop')}>See what&apos;s fresh <ArrowUpRight aria-hidden="true" /></button>
          </div>
          <span className="sidebar-footnote">Made for the hands that grow it.</span>
        </div>
      </aside>

      <nav className="mobile-nav" aria-label="Main navigation">
        {navigation.map(({ section, label, icon: Icon }) => (
          <button
            key={section}
            className={`mobile-nav-item${activeSection === section ? ' is-active' : ''}`}
            onClick={() => onNavigate(section)}
            aria-label={label}
            aria-current={activeSection === section ? 'page' : undefined}
          >
            <Icon aria-hidden="true" />
            <span>{label === 'Freshness scan' ? 'Scan' : label === 'Discover' ? 'Shop' : 'Orders'}</span>
          </button>
        ))}
        <button
          className={`mobile-nav-item${activeSection === 'farmer' ? ' is-active' : ''}`}
          onClick={() => onNavigate('farmer')}
          aria-label="Farmer studio"
          aria-current={activeSection === 'farmer' ? 'page' : undefined}
        >
          <Leaf aria-hidden="true" /><span>Farm</span>
        </button>
      </nav>
    </>
  )
}
