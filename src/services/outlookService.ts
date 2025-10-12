import { NotificationSubscriber } from '../contexts/SagachDataContext'

// Email interface
export interface NotificationEmail {
  from?: string
  to: string
  subject: string
  body: string
  cc?: string[]
  bcc?: string[]
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
        text: email.body.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        html: email.body
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
    changeDescription: string,
    provider?: string,
    arena?: string[]
  ): Promise<EmailApiResponse> {
    const subject = `עדכון סטטוס סג"ח: ${sagachName}`

    const body = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; direction: rtl; text-align: right; }
            .header { background: #f0f8ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .content { margin: 20px 0; }
            .footer { color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>עדכון סטטוס סג"ח</h2>
          </div>

          <div class="content">
            <p><strong>שם הסג"ח:</strong> ${sagachName}</p>
            ${provider ? `<p><strong>ספק:</strong> ${provider}</p>` : ''}
            ${arena && arena.length > 0 ? `<p><strong>זירות:</strong> ${arena.join(', ')}</p>` : ''}
            <p><strong>סטטוס קודם:</strong> ${oldStatus}</p>
            <p><strong>סטטוס חדש:</strong> ${newStatus}</p>
            <p><strong>תיאור השינוי:</strong> ${changeDescription}</p>
          </div>

          <div class="footer">
            <p>הודעה זו נשלחה אוטומטית ממערכת ניהול הסג"חים</p>
            <p>לשאלות או בעיות, פנה למנהל המערכת</p>
          </div>
        </body>
      </html>
    `

    return await this.sendEmail({
      to: subscriber.userId, // Assuming userId contains email address
      subject,
      body
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
        body: '<p>זוהי הודעת בדיקה לחיבור ל-API דואר</p>'
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
