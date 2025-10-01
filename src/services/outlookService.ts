import { NotificationSubscriber } from '../contexts/SagachDataContext'

// Outlook API configuration interface
export interface OutlookConfig {
  clientId: string
  clientSecret: string
  tenantId: string
  userPrincipalName?: string // Email address to send from
}

// Notification email template interface
export interface NotificationEmail {
  to: string
  subject: string
  body: string
  cc?: string[]
  bcc?: string[]
}

// Outlook API response interface
interface OutlookApiResponse {
  success: boolean
  messageId?: string
  error?: string
}

// Safe environment variable access for browser compatibility
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  // Check if we're in a browser environment
  if (typeof process === 'undefined' || typeof process.env === 'undefined') {
    // In browser, try to get from window object or return default
    return (window as any).__ENV__?.[key] || defaultValue
  }
  return process.env[key] || defaultValue
}

class OutlookService {
  private config: OutlookConfig
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null

  constructor(config?: Partial<OutlookConfig>) {
    this.config = {
      clientId: getEnvVar('OUTLOOK_CLIENT_ID', ''),
      clientSecret: getEnvVar('OUTLOOK_CLIENT_SECRET', ''),
      tenantId: getEnvVar('OUTLOOK_TENANT_ID', ''),
      userPrincipalName: getEnvVar('OUTLOOK_USER_EMAIL', ''),
      ...config
    }
  }

  /**
   * Authenticate with Microsoft Graph API using OAuth 2.0
   */
  async authenticate(): Promise<boolean> {
    try {
      if (!this.config.clientId || !this.config.clientSecret || !this.config.tenantId) {
        console.error('❌ Outlook API credentials not configured')
        return false
      }

      const tokenResponse = await this.getAccessToken()

      if (tokenResponse.success && tokenResponse.access_token) {
        this.accessToken = tokenResponse.access_token
        this.tokenExpiry = new Date(Date.now() + ((tokenResponse.expires_in || 3600) * 1000))
        console.log('✅ Outlook API authenticated successfully')
        return true
      } else {
        console.error('❌ Failed to authenticate with Outlook API:', tokenResponse.error)
        return false
      }
    } catch (error) {
      console.error('❌ Error authenticating with Outlook API:', error)
      return false
    }
  }

  /**
   * Get access token from Microsoft OAuth 2.0 endpoint
   */
  private async getAccessToken(): Promise<{ success: boolean; access_token?: string; expires_in?: number; error?: string }> {
    try {
      const tokenEndpoint = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`

      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: 'https://graph.microsoft.com/Mail.Send',
        grant_type: 'client_credentials'
      })

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      })

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        }
      }

      const data = await response.json()
      return {
        success: true,
        access_token: data.access_token,
        expires_in: data.expires_in
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Check if current access token is valid
   */
  private isTokenValid(): boolean {
    return this.accessToken !== null &&
           this.tokenExpiry !== null &&
           this.tokenExpiry > new Date()
  }

  /**
   * Refresh access token if needed
   */
  private async ensureValidToken(): Promise<boolean> {
    if (this.isTokenValid()) {
      return true
    }

    return await this.authenticate()
  }

  /**
   * Send email via Microsoft Graph API
   */
  async sendEmail(email: NotificationEmail): Promise<OutlookApiResponse> {
    try {
      // Ensure we have a valid token
      if (!(await this.ensureValidToken())) {
        return {
          success: false,
          error: 'Failed to authenticate with Outlook API'
        }
      }

      const graphEndpoint = 'https://graph.microsoft.com/v1.0/me/sendMail'

      const emailPayload = {
        message: {
          subject: email.subject,
          body: {
            contentType: 'HTML',
            content: email.body
          },
          toRecipients: email.to.split(',').map(addr => ({
            emailAddress: { address: addr.trim() }
          })),
          ...(email.cc && email.cc.length > 0 && {
            ccRecipients: email.cc.map(addr => ({
              emailAddress: { address: addr.trim() }
            }))
          }),
          ...(email.bcc && email.bcc.length > 0 && {
            bccRecipients: email.bcc.map(addr => ({
              emailAddress: { address: addr.trim() }
            }))
          })
        }
      }

      const response = await fetch(graphEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      })

      if (!response.ok) {
        const errorData = await response.text()
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorData}`
        }
      }

      // Microsoft Graph returns 202 Accepted for successful sends
      return {
        success: true,
        messageId: response.headers.get('Message-ID') || 'sent'
      }
    } catch (error) {
      console.error('❌ Error sending email via Outlook API:', error)
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
    changeDescription: string
  ): Promise<OutlookApiResponse> {
    const subject = `עדכון סטטוס סג"ח: ${sagachName}`

    const body = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; text-align: right; }
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
   * Test Outlook API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const testEmail: NotificationEmail = {
        to: this.config.userPrincipalName || '',
        subject: 'בדיקת חיבור ל-Outlook API',
        body: '<p>זוהי הודעת בדיקה לחיבור ל-Outlook API</p>'
      }

      const result = await this.sendEmail(testEmail)
      return result.success
    } catch (error) {
      console.error('❌ Outlook API test failed:', error)
      return false
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<OutlookConfig>): void {
    this.config = { ...this.config, ...newConfig }
    // Reset token when config changes
    this.accessToken = null
    this.tokenExpiry = null
  }
}

// Singleton instance
let outlookService: OutlookService | null = null

export const getOutlookService = (config?: Partial<OutlookConfig>): OutlookService => {
  if (!outlookService) {
    outlookService = new OutlookService(config)
  }
  return outlookService
}

export default OutlookService
