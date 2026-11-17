'use client'

import { useState } from 'react'
import { ArrowRight, Bell, Check, CheckCheck, ChevronRight, Clock3, Leaf, PackageCheck } from 'lucide-react'
import type { HarvestNotification } from '@/lib/harvestlink/types'

type NotificationsViewProps = {
  notifications: HarvestNotification[]
  loading: boolean
  error: boolean
  signedIn: boolean
  busy: boolean
  onMarkRead: (notificationId: string) => void
  onMarkAllRead: () => void
  onOpen: (notification: HarvestNotification) => void
  onRefresh: () => void
  onSignIn: () => void
}

export function NotificationsView({ notifications, loading, error, signedIn, busy, onMarkRead, onMarkAllRead, onOpen, onRefresh, onSignIn }: NotificationsViewProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const unreadCount = notifications.filter((notification) => !notification.read_at).length
  const visibleNotifications = filter === 'unread' ? notifications.filter((notification) => !notification.read_at) : notifications

  return (
    <div className="page-stack notification-page" id="notifications-panel" aria-labelledby="notifications-heading">
      <section className="page-heading-row">
        <div>
          <span className="eyebrow">YOUR HARVEST, AT A GLANCE</span>
          <h1 id="notifications-heading">Notifications</h1>
          <p>Order updates and timely freshness reminders, all in one place.</p>
        </div>
        {signedIn && unreadCount > 0 && (
          <button className="button button-outline notification-mark-all" onClick={onMarkAllRead} disabled={busy}>
            <CheckCheck aria-hidden="true" /> Mark all as read
          </button>
        )}
      </section>

      {!signedIn ? (
        <section className="empty-state empty-state--large">
          <span className="empty-icon"><Bell aria-hidden="true" /></span>
          <span className="eyebrow">JUST FOR YOU</span>
          <h2>Sign in to see your updates.</h2>
          <p>Order progress and freshness reminders will be kept here for your account.</p>
          <button className="button button-primary" onClick={onSignIn}>Sign in with phone <ArrowRight aria-hidden="true" /></button>
        </section>
      ) : (
        <>
          <div className="notification-toolbar">
            <div className="notification-filters" role="group" aria-label="Filter notifications">
              <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All <span>{notifications.length}</span></button>
              <button type="button" aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>Unread <span>{unreadCount}</span></button>
            </div>
            <span className="notification-privacy"><span aria-hidden="true" /> Only you can see these</span>
          </div>

          {loading ? (
            <div className="notification-skeleton-list" aria-label="Loading notifications" role="status">
              <span /><span /><span />
            </div>
          ) : error ? (
            <section className="empty-state">
              <span className="empty-icon"><Clock3 aria-hidden="true" /></span>
              <h2>Updates aren’t available right now.</h2>
              <p>Check your connection, then try loading your inbox again.</p>
              <button className="text-button" onClick={onRefresh}>Try again <ArrowRight aria-hidden="true" /></button>
            </section>
          ) : visibleNotifications.length > 0 ? (
            <ul className="notification-list" aria-label={filter === 'unread' ? 'Unread notifications' : 'All notifications'}>
              {visibleNotifications.map((notification) => {
                const unread = !notification.read_at
                const Icon = notification.kind === 'short_shelf_life' ? Leaf : notification.kind === 'order_status' ? PackageCheck : Bell

                return (
                  <li key={notification.id}>
                    <article className={`notification-card${unread ? ' is-unread' : ''}`}>
                      <button
                        className="notification-open"
                        onClick={() => onOpen(notification)}
                        aria-label={`${notification.title}. ${notification.message}. ${unread ? 'Unread.' : 'Read.'} Open update.`}
                      >
                        <span className={`notification-type-icon notification-type-icon--${notification.kind}`}><Icon aria-hidden="true" /></span>
                        <span className="notification-copy">
                          <span className="notification-title-row"><strong>{notification.title}</strong><time dateTime={notification.created_at}>{formatNotificationTime(notification.created_at)}</time></span>
                          <span className="notification-message">{notification.message}</span>
                        </span>
                        <ChevronRight className="notification-chevron" aria-hidden="true" />
                      </button>
                      {unread && <button className="notification-mark-read" onClick={() => onMarkRead(notification.id)} disabled={busy} aria-label={`Mark ${notification.title} as read`}><Check aria-hidden="true" /><span>Mark read</span></button>}
                    </article>
                  </li>
                )
              })}
            </ul>
          ) : (
            <section className="empty-state empty-state--large">
              <span className="empty-icon"><CheckCheck aria-hidden="true" /></span>
              <span className="eyebrow">ALL CAUGHT UP</span>
              <h2>{filter === 'unread' ? 'Nothing unread right now.' : 'Your next update will find you here.'}</h2>
              <p>{filter === 'unread' ? 'You’ve read every update in your inbox.' : 'We’ll let you know when an order changes or a freshness scan needs your attention.'}</p>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function formatNotificationTime(value: string) {
  const date = new Date(value)
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000)

  if (!Number.isFinite(minutes) || minutes < 0) return 'Just now'
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h ago`
  if (minutes < 10_080) return `${Math.floor(minutes / 1_440)}d ago`
  return new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short' }).format(date)
}
