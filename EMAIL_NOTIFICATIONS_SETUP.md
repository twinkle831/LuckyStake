# Email Notifications Feature - Setup & Implementation Guide

## Overview

The LuckyStake application now includes a comprehensive email notification system that alerts users when lottery draws are completed. Users can opt-in to receive email notifications for winner announcements and draw completions across different pool types (weekly, biweekly, monthly).

## Features Implemented

### Backend Features
- **Email Service**: Configurable email provider (SMTP or SendGrid)
- **User Email Management**: Store and manage user email addresses and preferences
- **Pool-Specific Preferences**: Users can choose notifications per pool type
- **Notification History**: Track all sent notifications in the database
- **Auto-trigger on Draw Completion**: Emails automatically sent when cron draws execute

### Frontend Features
- **Notification Preferences Component**: User-friendly settings interface
- **Email Input with Validation**: Real-time email address validation
- **Pool-Specific Toggles**: Enable/disable notifications per pool
- **Draw Notification Banner**: Real-time toast notification when draws complete
- **WebSocket Integration**: Real-time draw completion updates

## Environment Variables Configuration

### Backend (.env file)

Add the following environment variables to your `.env` file:

#### Email Provider Configuration

**Option 1: SMTP (Gmail, Outlook, etc.)**
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SENDER_EMAIL=noreply@luckystake.app
APP_URL=https://luckystake.app
```

**Option 2: SendGrid**
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDER_EMAIL=noreply@luckystake.app
APP_URL=https://luckystake.app
```

### Gmail SMTP Setup

If using Gmail for SMTP:

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password at https://myaccount.google.com/apppasswords
3. Use the generated password as `SMTP_PASSWORD`
4. Set `SMTP_HOST=smtp.gmail.com`
5. Set `SMTP_PORT=587`
6. Set `SMTP_SECURE=false`

### SendGrid Setup

If using SendGrid:

1. Create a SendGrid account at https://sendgrid.com
2. Generate an API key from Settings → API Keys
3. Add the API key as `SENDGRID_API_KEY`
4. Verify your sender email domain or single sender address

## Database Schema Changes

### User Model Updates

Users now have these additional fields:

```javascript
{
  publicKey: string,
  email: string | null,
  emailNotificationsEnabled: boolean,
  notificationPreferences: {
    weekly: boolean,
    biweekly: boolean,
    monthly: boolean
  },
  // ... other fields
}
```

### Notifications Table

A new `notifications` collection stores notification history:

```javascript
{
  id: string,           // UUID
  userId: string,       // User's public key
  poolType: string,     // "weekly" | "biweekly" | "monthly"
  email: string,
  subject: string,
  type: string,         // "winner" | "participant"
  drawnAt: string,      // ISO timestamp
  sentAt: string,       // ISO timestamp
  status: string,       // "sent" | "failed"
  error: string | null  // Error message if failed
}
```

## API Endpoints

### Email Management

#### POST /api/users/me/email
Set or update user's email address for notifications.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Email updated",
  "email": "user@example.com"
}
```

#### GET /api/users/me/notification-preferences
Retrieve user's email notification preferences.

**Response:**
```json
{
  "email": "user@example.com",
  "emailNotificationsEnabled": true,
  "notificationPreferences": {
    "weekly": true,
    "biweekly": true,
    "monthly": false
  }
}
```

#### PATCH /api/users/me/notification-preferences
Update notification preferences.

**Request:**
```json
{
  "emailNotificationsEnabled": true,
  "notificationPreferences": {
    "weekly": true,
    "biweekly": false,
    "monthly": true
  }
}
```

**Response:**
```json
{
  "message": "Notification preferences updated",
  "emailNotificationsEnabled": true,
  "notificationPreferences": {
    "weekly": true,
    "biweekly": false,
    "monthly": true
  }
}
```

### Notification History

#### GET /api/notifications
List user's notification history (paginated).

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "userId": "GBXXXXX...",
      "poolType": "weekly",
      "email": "user@example.com",
      "subject": "Congratulations! You won...",
      "type": "winner",
      "drawnAt": "2024-03-29T18:00:00Z",
      "sentAt": "2024-03-29T18:00:15Z",
      "status": "sent",
      "error": null
    }
  ]
}
```

#### GET /api/notifications/:id
Get a specific notification.

**Response:**
```json
{
  "id": "uuid",
  "userId": "GBXXXXX...",
  "poolType": "weekly",
  "email": "user@example.com",
  "subject": "...",
  "type": "winner",
  "drawnAt": "2024-03-29T18:00:00Z",
  "sentAt": "2024-03-29T18:00:15Z",
  "status": "sent",
  "error": null
}
```

## Frontend Components

### NotificationPreferences Component
Location: `frontend/components/notification-preferences.tsx`

Main component for users to configure their email notification settings. Includes:
- Email input field with validation
- Master toggle for all notifications
- Per-pool toggles (weekly, biweekly, monthly)
- Save/error feedback

**Usage:**
```tsx
import { NotificationPreferences } from "@/components/notification-preferences"

export function MyComponent() {
  return <NotificationPreferences />
}
```

### DrawNotificationBanner Component
Location: `frontend/components/draw-notification-banner.tsx`

Real-time toast banner that displays when a draw is completed. Shows:
- Winner announcement (if applicable)
- Draw details (pool type, prize amount)
- Auto-dismiss after 8 seconds

**Usage:**
```tsx
import { DrawNotificationBanner } from "@/components/draw-notification-banner"
import { useDrawNotification } from "@/context/draw-notification-context"

export function MyComponent() {
  const { notification, clearNotification } = useDrawNotification()
  
  return (
    <DrawNotificationBanner 
      notification={notification} 
      onDismiss={clearNotification}
    />
  )
}
```

### useNotificationPreferences Hook
Location: `frontend/hooks/use-notification-preferences.ts`

Custom hook for managing notification preferences. Methods:
- `fetchPreferences()` - Load user's preferences
- `updateEmail(email)` - Update email address
- `updatePreferences(updates)` - Update notification settings

## Email Templates

### Winner Notification
Sent to users who won a draw. Includes:
- Congratulations message
- Prize amount
- Pool type
- Link to dashboard

### Draw Completion Notification
Sent to all participating users. Includes:
- Draw information
- Winner details
- Participant count
- Link to dashboard

## WebSocket Events

The application listens for `draw_complete` events from the backend WebSocket:

```json
{
  "type": "draw_complete",
  "data": {
    "poolType": "weekly",
    "draw": {
      "id": "uuid",
      "poolType": "weekly",
      "winner": "GBXXXXX...",
      "prizeAmount": 100,
      "participants": 50,
      "drawnAt": "2024-03-29T18:00:00Z"
    },
    "winner": "GBXXXXX...",
    "prizeAmount": 100
  }
}
```

## Troubleshooting

### Emails Not Sending

1. **Check environment variables**: Ensure all required email configuration variables are set
2. **Verify email provider**: Test SMTP or SendGrid credentials separately
3. **Check logs**: Look for error messages in backend logs
4. **Validate email address**: Ensure user has entered a valid email address

### SMTP Connection Errors

- For Gmail: Ensure "Less secure app access" is enabled or use App Password
- For other providers: Verify SMTP host and port are correct
- Check firewall rules for outgoing SMTP connections (typically port 587)

### SendGrid Issues

- Verify API key is correct and active
- Ensure sender email is verified in SendGrid dashboard
- Check SendGrid activity log for bounce/delivery errors

## Testing

### Manual Testing

1. Connect wallet and open dashboard
2. Scroll to "Email Notifications" section
3. Enter email address and enable notifications
4. Save preferences
5. Trigger a draw using `/api/cron/run-draw-checks` endpoint
6. Check email for notification

### Testing Email Service

To test without triggering a draw:

```bash
# Call the cron endpoint directly
curl -X POST http://localhost:4000/api/cron/run-draw-checks \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET_KEY"
```

## Security Considerations

1. **Email Validation**: All email addresses are validated before storage
2. **Rate Limiting**: API endpoints are rate-limited to prevent abuse
3. **Authentication**: All email management endpoints require user authentication
4. **Sensitive Data**: Email addresses and preferences are only accessible to the authenticated user
5. **Error Handling**: Sensitive error information is not exposed to clients

## Deployment

### Environment Setup

1. Create `.env` file in backend directory with email configuration
2. Ensure database has migration applied (done automatically on startup)
3. Restart backend service for changes to take effect
4. Frontend automatically picks up the new API endpoints

### Production Considerations

1. Use SendGrid for production (more reliable than SMTP)
2. Implement email rate limiting to avoid spam complaints
3. Add unsubscribe links to emails (recommended best practice)
4. Monitor email delivery failures in notification logs
5. Set up log aggregation to track email service health

## Future Enhancements

Potential improvements to the email notification system:

1. **Batch Digest**: Weekly/monthly digest of all draws
2. **Unsubscribe Management**: Add unsubscribe links to emails
3. **HTML Email Templates**: More sophisticated email designs
4. **Localization**: Send emails in user's preferred language
5. **Email Verification**: Verify email addresses before sending
6. **Notification Scheduling**: Allow users to choose when emails are sent
7. **SMS Notifications**: Add SMS support alongside email

## Support

For issues or questions about the email notification feature:

1. Check the troubleshooting section above
2. Review backend logs for error messages
3. Verify environment configuration
4. Test email service connectivity separately
5. Contact LuckyStake support team

---

Last Updated: March 2024
