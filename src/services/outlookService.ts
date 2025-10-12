import { NotificationSubscriber, StatusUpdate, SagachimStatusItem } from '../contexts/SagachDataContext'
import { generateEmailHTML } from '../utils/emailTemplates'

/**
 * Check if there were any changes since the last notification sent to the subscriber
 * @param sagach - The sagach to check for changes
 * @param subscriber - The subscriber to check for
 * @returns true if there are changes since last notification, false otherwise
 */
export function hasChangesSinceLastNotification(
  sagach: SagachimStatusItem,
  subscriber: NotificationSubscriber
): boolean {
  // If no last notification time, there are "changes" (first notification)
  if (!subscriber.lastNotificationSent) {
    return true
  }

  const lastNotificationTime = new Date(subscriber.lastNotificationSent)
  const lastModifiedTime = new Date(sagach.lastModifiedAt)

  // Check if the sagach was modified after the last notification
  return lastModifiedTime > lastNotificationTime
}

// Email interface
export interface NotificationEmail {
  from?: string
  to: string
  cc?: string[]
  bcc?: string[]
  subject: string
  text: string
  html: string
}

// API response interface
interface EmailApiResponse {
  success: boolean
  messageId?: string
  error?: string
}

class OutlookService {
  private readonly apiEndpoint = 'http://post-office.d8200.mil/mail/send'
  private readonly apiKey = 'XXXX'
  private readonly fromEmail = 'thegreentree@d360.dom'

  /**
   * Send email via post-office API
   */
  async sendEmail(email: NotificationEmail): Promise<EmailApiResponse> {
    try {
      // Prepare the request body
      const requestBody = {
        from: email.from || this.fromEmail,
        to: email.to,
        cc: email.cc?.join(',') || '',
        bcc: email.bcc?.join(',') || '',
        subject: email.subject,
        text: email.text,
        html: email.html
      }

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Email send failed:', response.status, errorText)
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`
        }
      }

      const data = await response.json()
      console.log('✅ Email sent successfully:', data)
      
      return {
        success: true,
        messageId: data.messageId || 'sent'
      }
    } catch (error) {
      console.error('❌ Error sending email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Send notification email for sagach status change
   */
  async sendSagachNotification(
    subscriber: NotificationSubscriber,
    sagachName: string,
    oldStatus: string,
    newStatus: string,
    daycount: number,
    priority: string,
    hasStatusChanged: boolean,
    newStatusMessages: Array<{ message: string; timestamp: string; author?: string }>,
    provider?: string,
    arena?: string[]
  ): Promise<EmailApiResponse> {
    // Get today's date in format DD/MM/YYYY
    const todaysdate = new Date().toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })

    const subject = `עדכון סטטוס סג"ח יומי - ${sagachName}`

    // Plain text version
    const text = `
עדכון סטטוס סג"ח יומי

שם הסג"ח: ${sagachName}
תאריך: ${todaysdate}
${provider ? `ספק: ${provider}` : ''}
${arena && arena.length > 0 ? `זירות: ${arena.join(', ')}` : ''}

סטטוס נוכחי: ${newStatus}

כמות ימים בשלב הנוכחי: ${daycount}
תעדוף: ${priority}

הודעה זו נשלחה אוטומטית ממערכת "העץ הירוק"
לשאלות או בעיות, פנו ליותם פוגל
    `.trim()

    // Get current process status number from STATUS_LABELS
    const statusLabels: Record<number, string> = {
      1: 'ממתין לבשלות בצד ספק',
      2: 'ממתין לקבלת דג"ח והתנעה',
      3: 'בתהליכי אפיון',
      4: 'ממתין לאינטגרציות',
      5: 'באינטגרציות',
      6: 'בתהליכי מבצוע',
      7: 'מובצע'
    }
    
    // Find current phase number by matching status
    let currentPhase = 1
    for (const [key, label] of Object.entries(statusLabels)) {
      if (label === newStatus) {
        currentPhase = parseInt(key)
        break
      }
    }

    // Generate HTML using shared template (single source of truth)
    const html = generateEmailHTML({
      sagachName,
      newStatus,
      daycount,
      priority,
      hasStatusChanged,
      newStatusMessages,
      notificationFrequency: subscriber.notificationFrequency,
      currentPhaseNumber: currentPhase
    })

    return await this.sendEmail({
      to: subscriber.userId, // Assuming userId contains email address
      subject,
      text,
      html
    })
  }

  /**
   * Test email API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const testEmail: NotificationEmail = {
        to: this.fromEmail,
        subject: 'בדיקת חיבור ל-API דואר',
        text: 'זוהי הודעת בדיקה לחיבור ל-API דואר',
        html: '<p>זוהי הודעת בדיקה לחיבור ל-API דואר</p>'
      }

      const result = await this.sendEmail(testEmail)
      return result.success
    } catch (error) {
      console.error('❌ Email API test failed:', error)
      return false
    }
  }

  /**
   * Authenticate (kept for compatibility, but not needed for new API)
   */
  async authenticate(): Promise<boolean> {
    // New API uses API key, no authentication needed
    console.log('✅ Email service ready (API key authentication)')
    return true
  }
}

// Singleton instance
let outlookService: OutlookService | null = null

export const getOutlookService = (): OutlookService => {
  if (!outlookService) {
    outlookService = new OutlookService()
  }
  return outlookService
}

export default OutlookService
