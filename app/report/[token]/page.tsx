import { notFound } from 'next/navigation'
import { ArrowUpRight, BadgeCheck, CalendarDays, ChartNoAxesCombined, ClipboardCheck, Leaf, PackageCheck, ScanLine, Sprout } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

type PublicReport = {
  farmer_name: string
  farm_name: string
  generated_at: string
  expires_at: string
  period_days: number
  listings_created: number
  active_listings: number
  orders_received: number
  orders_delivered: number
  sales_value_ngn: number
  scans_completed: number
}

export default async function ActivityReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_public_activity_report', { p_token: token })
  if (error || !data) notFound()
  const report = data as PublicReport
  const date = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' })
  const expiry = new Date(report.expires_at)
  const generated = new Date(report.generated_at)
  const sales = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(report.sales_value_ngn) || 0)

  return (
    <main className="public-report-page">
      <header className="report-public-topbar"><a className="report-public-brand" href="/"><span><Sprout aria-hidden="true" /></span> harvest<span>link</span></a><span className="report-expiry-badge"><BadgeCheck aria-hidden="true" /> Private activity summary</span></header>
      <article className="public-report-card">
        <div className="public-report-cover"><div className="report-cover-mark"><Leaf aria-hidden="true" /></div><span className="eyebrow eyebrow-light">A RECORD OF CARE & CONSISTENCY</span><h1>{report.farm_name}</h1><p>Farmer activity summary for {report.farmer_name}</p><div className="report-period"><CalendarDays aria-hidden="true" /> Previous {report.period_days} days <span>·</span> Generated {date.format(generated)}</div><span className="report-cover-leaf" aria-hidden="true"><Leaf /></span></div>
        <div className="public-report-body">
          <div className="report-section-heading"><div><span className="eyebrow">MARKETPLACE ACTIVITY</span><h2>A clear view of what&apos;s growing.</h2></div><span className="report-window-tag">{report.period_days} DAY SNAPSHOT</span></div>
          <div className="public-report-stats">
            <ReportStat icon={<Sprout aria-hidden="true" />} label="Harvests listed" value={report.listings_created} detail="Listings created" tone="green" />
            <ReportStat icon={<PackageCheck aria-hidden="true" />} label="Currently active" value={report.active_listings} detail="Available harvests" tone="gold" />
            <ReportStat icon={<ClipboardCheck aria-hidden="true" />} label="Orders received" value={report.orders_received} detail="Marketplace orders" tone="lilac" />
            <ReportStat icon={<ChartNoAxesCombined aria-hidden="true" />} label="Orders delivered" value={report.orders_delivered} detail="Marked delivered" tone="peach" />
            <ReportStat icon={<ArrowUpRight aria-hidden="true" />} label="Sales recorded" value={sales} detail="From delivered orders" tone="green" />
            <ReportStat icon={<ScanLine aria-hidden="true" />} label="Freshness scans" value={report.scans_completed} detail="Produce scans completed" tone="gold" />
          </div>
          <div className="public-report-disclaimer"><BadgeCheck aria-hidden="true" /><p>This summary reflects activity recorded on HarvestLink. It is informational only—not a credit score, guarantee, or lending decision. Always verify details independently.</p></div>
          <div className="public-report-footer"><span><Leaf aria-hidden="true" /> A little closer to fresh.</span><span>Link expires {date.format(expiry)}</span></div>
        </div>
      </article>
      <p className="public-report-powered">Shared by {report.farmer_name} · HarvestLink activity record</p>
    </main>
  )
}

function ReportStat({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: number | string; detail: string; tone: string }) {
  return <article className="public-report-stat"><span className={`public-stat-icon public-stat-icon--${tone}`}>{icon}</span><span className="public-stat-label">{label}</span><strong>{typeof value === 'number' ? new Intl.NumberFormat('en-NG').format(value) : value}</strong><small>{detail}</small></article>
}
