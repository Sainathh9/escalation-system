import { useEffect, useRef } from 'react';
import { Bell, CheckCheck, Trash2, X, Ticket, AlertTriangle, MessageSquare, UserCheck, TrendingUp, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications.js';

// ── Icon + color map per notification type ────────────────────
const TYPE_CONFIG = {
  TICKET_CREATED:    { icon: Ticket,        color: 'var(--accent)',           label: 'New Ticket'    },
  TICKET_ASSIGNED:   { icon: UserCheck,     color: 'var(--status-progress)',  label: 'Assigned'      },
  TICKET_REASSIGNED: { icon: UserCheck,     color: 'var(--status-progress)',  label: 'Reassigned'    },
  SLA_WARNING:       { icon: AlertTriangle, color: 'var(--status-critical)',  label: 'SLA Warning'   },
  TICKET_ESCALATED:  { icon: TrendingUp,    color: 'var(--status-critical)',  label: 'Escalated'     },
  TICKET_RESOLVED:   { icon: CheckCircle,   color: 'var(--status-resolved)',  label: 'Resolved'      },
  TICKET_CLOSED:     { icon: CheckCircle,   color: 'var(--status-resolved)',  label: 'Closed'        },
  NEW_COMMENT:       { icon: MessageSquare, color: 'var(--accent)',           label: 'Comment'       },
};

const getTypeConfig = (type) =>
  TYPE_CONFIG[type] || { icon: Bell, color: 'var(--text-secondary)', label: type };

// ── Relative time formatter ───────────────────────────────────
const relativeTime = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

// ── Notification Item ─────────────────────────────────────────
function NotificationItem({ notification, onMarkRead, onDelete, onNavigate }) {
  const config = getTypeConfig(notification.type);
  const Icon = config.icon;

  const handleClick = () => {
    if (!notification.is_read) onMarkRead(notification.id);
    if (notification.ticket_id) onNavigate(notification.ticket_id);
  };

  return (
    <div
      className={`notif-item ${!notification.is_read ? 'notif-item--unread' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      {/* Unread indicator */}
      {!notification.is_read && <span className="notif-unread-dot" />}

      {/* Type icon */}
      <div className="notif-icon-wrap" style={{ color: config.color, background: `${config.color}18` }}>
        <Icon size={14} />
      </div>

      {/* Content */}
      <div className="notif-content">
        <span className="notif-type-badge" style={{ color: config.color }}>{config.label}</span>
        <p className="notif-message">{notification.message}</p>
        <span className="notif-time">{relativeTime(notification.created_at)}</span>
      </div>

      {/* Actions */}
      <div className="notif-actions" onClick={(e) => e.stopPropagation()}>
        {!notification.is_read && (
          <button
            className="notif-action-btn"
            title="Mark as read"
            onClick={() => onMarkRead(notification.id)}
          >
            <CheckCheck size={12} />
          </button>
        )}
        <button
          className="notif-action-btn notif-action-btn--danger"
          title="Delete"
          onClick={() => onDelete(notification.id)}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Main Bell Component ───────────────────────────────────────
export default function NotificationBell() {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const bellRef  = useRef(null);

  const {
    notifications,
    unreadCount,
    isOpen,
    loading,
    hasLoaded,
    togglePanel,
    closePanel,
    handleMarkRead,
    handleMarkAllRead,
    handleDelete,
  } = useNotifications();

  // Close panel on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        isOpen &&
        panelRef.current && !panelRef.current.contains(e.target) &&
        bellRef.current  && !bellRef.current.contains(e.target)
      ) {
        closePanel();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, closePanel]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') closePanel(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [closePanel]);

  const handleNavigate = (ticketId) => {
    closePanel();
    navigate(`/tickets/${ticketId}`);
  };

  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const readNotifications   = notifications.filter((n) => n.is_read);

  return (
    <div className="notif-bell-wrapper">
      {/* Bell button */}
      <button
        ref={bellRef}
        className={`topbar-btn notif-bell-btn ${isOpen ? 'notif-bell-btn--active' : ''}`}
        id="notifications-btn"
        onClick={togglePanel}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="notif-badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="notif-panel"
          role="dialog"
          aria-label="Notifications"
        >
          {/* Panel Header */}
          <div className="notif-panel-header">
            <div className="notif-panel-title-group">
              <h3 className="notif-panel-title">Notifications</h3>
              {unreadCount > 0 && (
                <span className="notif-panel-count">{unreadCount} unread</span>
              )}
            </div>
            <div className="notif-panel-actions">
              {unreadCount > 0 && (
                <button
                  className="notif-header-btn"
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                >
                  <CheckCheck size={13} />
                  Mark all read
                </button>
              )}
              <button
                className="notif-header-btn notif-header-btn--icon"
                onClick={closePanel}
                aria-label="Close notifications"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Panel Body */}
          <div className="notif-panel-body">
            {loading && !hasLoaded ? (
              <div className="notif-empty">
                <div className="notif-loading-wrap">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="notif-skeleton">
                      <div className="notif-skeleton-icon" />
                      <div className="notif-skeleton-lines">
                        <div className="notif-skeleton-line notif-skeleton-line--short" />
                        <div className="notif-skeleton-line" />
                        <div className="notif-skeleton-line notif-skeleton-line--xshort" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-icon">
                  <Bell size={28} />
                </div>
                <p className="notif-empty-title">All caught up!</p>
                <p className="notif-empty-sub">No notifications yet.</p>
              </div>
            ) : (
              <>
                {/* Unread section */}
                {unreadNotifications.length > 0 && (
                  <div className="notif-section">
                    <span className="notif-section-label">New</span>
                    {unreadNotifications.map((n) => (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        onMarkRead={handleMarkRead}
                        onDelete={handleDelete}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                )}

                {/* Read section */}
                {readNotifications.length > 0 && (
                  <div className="notif-section">
                    <span className="notif-section-label">Earlier</span>
                    {readNotifications.map((n) => (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        onMarkRead={handleMarkRead}
                        onDelete={handleDelete}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
