import { createContext, useContext, useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'

export interface AppNotification {
    id: string
    title: string
    message: string
    severity: 'info' | 'success' | 'warning' | 'error'
    timestamp: number
}

interface NotificationContextType {
    notifications: AppNotification[]
    unreadCount: number
    markAllAsRead: () => void
    clearNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType>({
    notifications: [],
    unreadCount: 0,
    markAllAsRead: () => {},
    clearNotifications: () => {}
})

export const useNotifications = () => useContext(NotificationContext)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<AppNotification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)

    useEffect(() => {
        // Listen for the specific event emitted by Rust
        const unlisten = listen<AppNotification>('app-notification', (event) => {
            console.log("Frontend received notification:", event.payload)
            
            setNotifications(prev => [event.payload, ...prev])
            setUnreadCount(prev => prev + 1)
        })

        return () => {
            unlisten.then(f => f())
        }
    }, [])

    const markAllAsRead = () => {
        setUnreadCount(0)
    }

    const clearNotifications = () => {
        setNotifications([])
        setUnreadCount(0)
    }

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAllAsRead, clearNotifications }}>
            {children}
        </NotificationContext.Provider>
    )
}
