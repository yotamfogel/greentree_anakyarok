import { SagachimStatusItem, NotificationSubscriber } from '../contexts/SagachDataContext'
import { getDatabaseService } from './postgreSQLService'
import { getOutlookService } from './outlookService'

// Notification service configuration
export interface NotificationConfig {
  enabled: boolean
  checkIntervalMinutes: number
  outlookEnabled: boolean
}

// Status mapping for Hebrew display
const STATUS_LABELS: Record<number, string> = {
  1: 'ממתין לבשלות בצד ספק',
  2: 'ממתין לקבלת דג"ח והתנעה',
  3: 'בתהליכי אפיון',
  4: 'ממתין לאינטגרציות',
  5: 'ממתין לבדיקות',
  6: 'מוכן ל-production',
  7: 'מובצע'
}

class NotificationService {
  private config: NotificationConfig
  private dbService: any
  private outlookService: any
  private isRunning: boolean = false
  private lastCheckTimestamp: Date = new Date()

  constructor(config?: Partial<NotificationConfig>) {
    this.config = {
      enabled: true,
      checkIntervalMinutes: 5,
      outlookEnabled: true,
      ...config
    }

    this.dbService = getDatabaseService()
    this.outlookService = getOutlookService()
  }

  /**
   * Start the notification service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('🔔 Notification service is already running')
      return
    }

    try {
      // Test Outlook API connection if enabled
      if (this.config.outlookEnabled) {
        const outlookConnected = await this.outlookService.testConnection()
        if (!outlookConnected) {
          console.warn('⚠️ Outlook API not available, notifications will not be sent via email')
        }
      }

      this.isRunning = true
      console.log(`🔔 Notification service started (checking every ${this.config.checkIntervalMinutes} minutes)`)

      // Start the notification loop
      this.startNotificationLoop()
    } catch (error) {
      console.error('❌ Failed to start notification service:', error)
      this.isRunning = false
    }
  }

  /**
   * Stop the notification service
   */
  stop(): void {
    this.isRunning = false
    console.log('🔔 Notification service stopped')
  }

  /**
   * Start the main notification checking loop
   */
  private startNotificationLoop(): void {
    const checkNotifications = async () => {
      if (!this.isRunning) return

      try {
        await this.checkAndSendNotifications()
      } catch (error) {
        console.error('❌ Error in notification loop:', error)
      }

      // Schedule next check
      if (this.isRunning) {
        setTimeout(checkNotifications, this.config.checkIntervalMinutes * 60 * 1000)
      }
    }

    // Start the first check immediately
    setTimeout(checkNotifications, 1000)
  }

  /**
   * Check for status changes and send notifications
   */
  private async checkAndSendNotifications(): Promise<void> {
    try {
      // Load all sagachim status items
      const sagachim = await this.dbService.loadSagachimStatus()

      for (const sagach of sagachim) {
        await this.processSagachNotifications(sagach)
      }

      this.lastCheckTimestamp = new Date()
      console.log(`✅ Notification check completed at ${this.lastCheckTimestamp.toISOString()}`)
    } catch (error) {
      console.error('❌ Error checking notifications:', error)
    }
  }

  /**
   * Process notifications for a specific sagach
   */
  private async processSagachNotifications(sagach: SagachimStatusItem): Promise<void> {
    if (!sagach.notificationSubscribers || sagach.notificationSubscribers.length === 0) {
      return
    }

    // Check if this sagach needs notifications based on frequency settings
    for (const subscriber of sagach.notificationSubscribers) {
      if (await this.shouldSendNotification(sagach, subscriber)) {
        await this.sendNotification(sagach, subscriber)
      }
    }
  }

  /**
   * Determine if a notification should be sent based on frequency settings
   */
  private async shouldSendNotification(sagach: SagachimStatusItem, subscriber: NotificationSubscriber): Promise<boolean> {
    try {
      const frequency = subscriber.notificationFrequency

      switch (frequency) {
        case 'status_change':
          // Check if status changed since last notification
          return await this.hasStatusChanged(sagach, subscriber)

        case 'daily':
          // Check if it's been 24 hours since last notification
          return await this.isDailyNotificationDue(sagach, subscriber)

        case 'weekly':
          // Check if it's been 7 days since last notification
          return await this.isWeeklyNotificationDue(sagach, subscriber)

        default:
          return false
      }
    } catch (error) {
      console.error('❌ Error checking notification frequency:', error)
      return false
    }
  }

  /**
   * Check if status has changed since last notification
   */
  private async hasStatusChanged(sagach: SagachimStatusItem, subscriber: NotificationSubscriber): Promise<boolean> {
    try {
      // Get the most recent status update
      const recentUpdates = sagach.statusUpdates || []
      const latestUpdate = recentUpdates
        .filter(update => update.type === 'status_change' || update.type === 'user')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]

      if (!latestUpdate) {
        return false // No updates to check
      }

      // Check if this is a recent status change (within last hour to avoid spam)
      const updateTime = new Date(latestUpdate.timestamp)
      const now = new Date()
      const hoursSinceUpdate = (now.getTime() - updateTime.getTime()) / (1000 * 60 * 60)

      return hoursSinceUpdate <= 1 // Only notify for very recent changes
    } catch (error) {
      console.error('❌ Error checking status change:', error)
      return false
    }
  }

  /**
   * Check if daily notification is due
   */
  private async isDailyNotificationDue(sagach: SagachimStatusItem, subscriber: NotificationSubscriber): Promise<boolean> {
    try {
      // For now, implement simple logic - send once per day
      // In a production system, you'd track last notification times per subscriber
      const now = new Date()
      const hoursSinceMidnight = now.getHours()

      // Send notifications between 9 AM and 10 AM daily
      return hoursSinceMidnight >= 9 && hoursSinceMidnight <= 10
    } catch (error) {
      console.error('❌ Error checking daily notification:', error)
      return false
    }
  }

  /**
   * Check if weekly notification is due
   */
  private async isWeeklyNotificationDue(sagach: SagachimStatusItem, subscriber: NotificationSubscriber): Promise<boolean> {
    try {
      // Send weekly notifications on Monday mornings
      const now = new Date()
      const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
      const hours = now.getHours()

      return dayOfWeek === 1 && hours >= 9 && hours <= 10 // Monday 9-10 AM
    } catch (error) {
      console.error('❌ Error checking weekly notification:', error)
      return false
    }
  }

  /**
   * Send notification to a subscriber
   */
  private async sendNotification(sagach: SagachimStatusItem, subscriber: NotificationSubscriber): Promise<void> {
    try {
      if (!this.config.outlookEnabled) {
        console.log(`📧 Would send notification to ${subscriber.userName} for ${sagach.name} (Outlook disabled)`)
        return
      }

      // Get the latest status information
      const currentStatus = STATUS_LABELS[sagach.processStatus] || `סטטוס ${sagach.processStatus}`
      const oldStatus = this.getPreviousStatusLabel(sagach)

      const changeDescription = this.generateChangeDescription(sagach)

      const result = await this.outlookService.sendSagachNotification(
        subscriber,
        sagach.name,
        oldStatus,
        currentStatus,
        changeDescription
      )

      if (result.success) {
        console.log(`✅ Notification sent to ${subscriber.userName} for ${sagach.name}`)
      } else {
        console.error(`❌ Failed to send notification to ${subscriber.userName}:`, result.error)
      }
    } catch (error) {
      console.error(`❌ Error sending notification to ${subscriber.userName}:`, error)
    }
  }

  /**
   * Get the previous status label for comparison
   */
  private getPreviousStatusLabel(sagach: SagachimStatusItem): string {
    const statusUpdates = sagach.statusUpdates || []
    const statusChangeUpdates = statusUpdates.filter(update => update.oldStatus && update.newStatus)

    if (statusChangeUpdates.length > 0) {
      const latestStatusChange = statusChangeUpdates
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]

      return STATUS_LABELS[latestStatusChange.oldStatus!] || `סטטוס ${latestStatusChange.oldStatus}`
    }

    return 'לא ידוע'
  }

  /**
   * Generate a description of the changes
   */
  private generateChangeDescription(sagach: SagachimStatusItem): string {
    const updates = sagach.statusUpdates || []
    const recentUpdates = updates
      .filter(update => {
        const updateTime = new Date(update.timestamp)
        const now = new Date()
        const hoursDiff = (now.getTime() - updateTime.getTime()) / (1000 * 60 * 60)
        return hoursDiff <= 24 // Last 24 hours
      })
      .slice(0, 3) // Last 3 updates

    if (recentUpdates.length === 0) {
      return 'עדכון שגרתי במערכת'
    }

    return recentUpdates
      .map(update => update.message)
      .join(' • ')
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('🔧 Notification service configuration updated')
  }

  /**
   * Get current status
   */
  getStatus(): { isRunning: boolean; lastCheck: Date; config: NotificationConfig } {
    return {
      isRunning: this.isRunning,
      lastCheck: this.lastCheckTimestamp,
      config: this.config
    }
  }
}

// Singleton instance
let notificationService: NotificationService | null = null

export const getNotificationService = (config?: Partial<NotificationConfig>): NotificationService => {
  if (!notificationService) {
    notificationService = new NotificationService(config)
  }
  return notificationService
}

export default NotificationService


