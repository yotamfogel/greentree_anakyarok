import { NotificationSubscriber } from '../contexts/SagachDataContext'

interface EmailTemplateParams {
  sagachName: string
  newStatus: string
  daycount: number
  priority: string
  hasStatusChanged: boolean
  newStatusMessages: Array<{ message: string; timestamp: string; author?: string }>
  notificationFrequency: 'daily' | 'weekly' | 'status_change'
  currentPhaseNumber: number
}

/**
 * Generate unified HTML email template
 * Single source of truth for both actual emails and preview
 */
export function generateEmailHTML(params: EmailTemplateParams): string {
  const {
    sagachName,
    newStatus,
    daycount,
    priority,
    hasStatusChanged,
    newStatusMessages,
    notificationFrequency,
    currentPhaseNumber
  } = params

  // Get today's date in format DD/MM/YYYY
  const todaysdate = new Date().toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  // HTML version with conditional status change message
  const statusChangeMessage = hasStatusChanged
    ? '<p style="color:#4caf50; font-size: 20px"><strong>היה עדכון לגבי סטטוס הסג"ח מאז המייל האחרון שנשלח!</strong></p>'
    : '<p style="color:#ff9800; font-size: 20px"><strong>לא היה עדכון מאז המייל האחרון - זהו עדכון יומי שגרתי</strong></p>'

  // Define all process steps
  const PROCESS_STEPS = [
    'ממתין לבשלות בצד ספק',
    'ממתין לקבלת דג"ח והתנעה',
    'בתהליכי אפיון',
    'ממתין לאינטגרציות',
    'באינטגרציות',
    'בתהליכי מבצוע',
    'מובצע'
  ]

  // Generate process chain HTML
  const processChainHTML = `
  <div class="process-chain">
    ${PROCESS_STEPS.map((step, index) => {
      const phaseNumber = index + 1
      const isCurrent = phaseNumber === currentPhaseNumber
      const isPast = phaseNumber < currentPhaseNumber
      
      return `
      <div class="phase-step ${isCurrent ? 'current' : ''} ${isPast ? 'completed' : ''}">
        <div class="phase-number">${phaseNumber}</div>
        <div class="phase-name">${step}</div>
      </div>
      ${index < PROCESS_STEPS.length - 1 ? '<div class="phase-connector"></div>' : ''}
      `
    }).join('')}
  </div>
  `

  // Generate status updates HTML
  // Note: Messages are already sorted oldest first by full timestamp (including seconds/milliseconds)
  // We display without seconds for cleaner presentation (HH:mm format)
  const statusUpdatesHTML = newStatusMessages.length > 0 ? `
  <div class="status-updates">
    <h3>עדכונים חדשים:</h3>
    ${newStatusMessages.map(update => {
      const date = new Date(update.timestamp)
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      const year = date.getFullYear()
      // Display format: HH:mm, MM/dd/YYYY (no seconds for cleaner look)
      const formattedDate = `${hours}:${minutes}, ${month}/${day}/${year}`
      
      return `
      <div class="update-item">
        <div class="update-message">${update.message}</div>
        <div class="update-meta">${formattedDate}${update.author ? ` • ${update.author}` : ''}</div>
      </div>
      `
    }).join('')}
  </div>
  ` : ''

  // Determine frequency text for email header
  const frequencyText = notificationFrequency === 'daily' 
    ? 'יומי' 
    : notificationFrequency === 'weekly' 
      ? 'שבועי' 
      : ''

  // Generate unified HTML email template
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            background:
                radial-gradient(1200px 800px at 80% 20%, rgba(124, 192, 255, 0.15), transparent 50%),
                radial-gradient(1000px 700px at 10% 90%, rgba(167, 90, 255, 0.12), transparent 50%),
                #0b0f17;
            font-family: 'Segoe UI', Arial, sans-serif;
            direction: rtl;
            text-align: center;
            color: white;
            padding: 20px;
            margin: 0;
        }

        .header {
            padding: 2px;
            border-radius: 0px;
            margin-bottom: 0px;
            color: white;
            text-decoration: underline;
            font-size: 18px;
        }

        .content {
            margin: 0px 0;
        }

        .status-box {
            background: linear-gradient(135deg, rgba(124, 192, 255, 0.25), rgba(124, 192, 255, 0.15));
            border: 2px solid rgba(124, 192, 255, 0.6);
            border-radius: 12px;
            padding: 20px;
            margin: 30px auto;
            max-width: 500px;
            font-size: 26px;
            font-weight: bold;
            color: #7cc0ff;
            box-shadow: 0 4px 16px rgba(124, 192, 255, 0.4);
        }

        .process-chain {
            display: flex;
            flex-direction: column;
            gap: 0;
            margin: 30px auto;
            max-width: 600px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 20px;
        }

        .phase-step {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 12px 15px;
            border-radius: 8px;
            transition: all 0.3s ease;
        }

        .phase-step.completed {
            background: rgba(76, 175, 80, 0.15);
            border-right: 4px solid #4caf50;
        }

        .phase-step.current {
            background: linear-gradient(135deg, rgba(124, 192, 255, 0.3), rgba(124, 192, 255, 0.15));
            border-right: 4px solid #7cc0ff;
            box-shadow: 0 0 12px rgba(124, 192, 255, 0.4);
        }

        .phase-step:not(.current):not(.completed) {
            background: rgba(255, 255, 255, 0.02);
            border-right: 4px solid rgba(255, 255, 255, 0.2);
            opacity: 0.6;
        }

        .phase-number {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 16px;
            flex-shrink: 0;
        }

        .phase-step.completed .phase-number {
            background: #4caf50;
            color: white;
        }

        .phase-step.current .phase-number {
            background: #7cc0ff;
            color: white;
            box-shadow: 0 0 8px rgba(124, 192, 255, 0.6);
        }

        .phase-step:not(.current):not(.completed) .phase-number {
            background: rgba(255, 255, 255, 0.1);
            color: #99a3b3;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .phase-name {
            font-size: 14px;
            text-align: right;
            flex: 1;
        }

        .phase-step.completed .phase-name {
            color: #4caf50;
            font-weight: 600;
        }

        .phase-step.current .phase-name {
            color: #7cc0ff;
            font-weight: bold;
        }

        .phase-step:not(.current):not(.completed) .phase-name {
            color: #99a3b3;
        }

        .status-updates {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 20px;
            margin: 20px auto;
            max-width: 600px;
            text-align: right;
        }

        .status-updates h3 {
            color: #7cc0ff;
            font-size: 18px;
            margin: 0 0 15px 0;
            text-decoration: underline;
        }

        .update-item {
            background: rgba(255, 255, 255, 0.03);
            border-right: 3px solid #7cc0ff;
            padding: 12px 15px;
            margin-bottom: 10px;
            border-radius: 6px;
        }

        .update-message {
            color: white;
            font-size: 14px;
            margin-bottom: 5px;
            line-height: 1.5;
        }

        .update-meta {
            color: #99a3b3;
            font-size: 12px;
        }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin: 20px auto;
            max-width: 600px;
        }

        .info-box {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            padding: 16px;
            text-align: center;
        }

        .info-label {
            color: #99a3b3;
            font-size: 12px;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .info-value {
            color: #7cc0ff;
            font-size: 24px;
            font-weight: bold;
        }

        .app-link-container {
            text-align: center;
            margin: 24px auto;
        }

        .app-link-btn {
            display: inline-block;
            padding: 14px 32px;
            background: linear-gradient(135deg, rgba(124, 192, 255, 0.8), rgba(124, 192, 255, 0.6));
            border: 2px solid rgba(124, 192, 255, 0.8);
            border-radius: 12px;
            color: white;
            font-size: 16px;
            font-weight: bold;
            text-decoration: none;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(124, 192, 255, 0.3);
        }

        .app-link-btn:hover {
            background: linear-gradient(135deg, rgba(124, 192, 255, 0.9), rgba(124, 192, 255, 0.7));
            box-shadow: 0 6px 16px rgba(124, 192, 255, 0.5);
            transform: translateY(-2px);
        }

        .footer {
            color: white;
            font-size: 12px;
            margin-top: 120px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>עדכון סטטוס סג"ח ${frequencyText} - ${sagachName} // ${todaysdate}</h2>
    </div>

    <div class="content">
    ${statusChangeMessage}
    <div class="info-grid">
            <div class="info-box">
                <div class="info-label">כמות ימים בשלב הנוכחי</div>
                <div class="info-value">${daycount}</div>
            </div>
            <div class="info-box">
                <div class="info-label">תעדוף</div>
                <div class="info-value">${priority}</div>
            </div>
        </div>
        
        ${statusUpdatesHTML}
        ${processChainHTML}
        
        <div class="app-link-container">
            <a href="go/greentree" class="app-link-btn">לסטטוס הסג"חים</a>
        </div>
    </div>

    <div class="footer">
        <p>הודעה זו נשלחה אוטומטית ממערכת "העץ הירוק" מכיוון שנרשמת לקבל עדכונים על הסג"ח</p>
        <p>תוכלו להסיר את עצמכם מרשימת התפוצה של עדכוני הסג"ח על ידי לחיצה על הקישור למערכת ולחיצה על כפתור ההתראות</p>
        <p>לשאלות או בעיות, פנו ליותם פוגל במייל או בג'אבר</p>
        <p>oa214560286 // INSERTVOIP</p>
    </div>
</body>
</html>`
}

