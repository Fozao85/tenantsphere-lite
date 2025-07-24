# WhatsApp Business API Setup Guide

This guide will help you set up WhatsApp Business API for Tenantsphere Lite.

## Prerequisites

- A Facebook Business Account
- A verified business phone number
- A Meta Developer Account
- Your application must be approved by Meta for production use

## 1. Create Meta Developer App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Select "Business" as the app type
4. Fill in app details:
   - App Name: `Tenantsphere Lite`
   - App Contact Email: Your business email
   - Business Account: Select your business account
5. Click "Create App"

## 2. Add WhatsApp Business API

1. In your app dashboard, click "Add Product"
2. Find "WhatsApp" and click "Set up"
3. Select your Business Account
4. Click "Continue"

## 3. Configure WhatsApp Business API

### 3.1 Get API Credentials

1. In the WhatsApp section, go to "API Setup"
2. Note down these values:
   - **App ID**: Found in App Settings → Basic
   - **App Secret**: Found in App Settings → Basic
   - **Phone Number ID**: Found in WhatsApp → API Setup
   - **Business Account ID**: Found in WhatsApp → API Setup

### 3.2 Generate Access Token

1. Go to WhatsApp → API Setup
2. Click "Generate Access Token"
3. Select your app and required permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. Copy the generated token (this is temporary for testing)

### 3.3 Add Phone Number

1. In WhatsApp → API Setup, click "Add phone number"
2. Enter your business phone number
3. Verify the number via SMS or call
4. Complete the verification process

## 4. Configure Webhooks

### 4.1 Set Webhook URL

1. In WhatsApp → Configuration, find "Webhooks"
2. Click "Edit" next to Callback URL
3. Enter your webhook URL: `https://your-domain.com/webhook/whatsapp`
4. Enter a Verify Token (create a random string and save it)

### 4.2 Subscribe to Webhook Events

Subscribe to these events:
- `messages` - Incoming messages
- `message_deliveries` - Delivery receipts
- `message_reads` - Read receipts
- `message_reactions` - Message reactions

## 5. Update Environment Variables

Add these values to your `.env` file:

```env
# WhatsApp Business API Configuration
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token_here
WHATSAPP_WEBHOOK_SECRET=your_webhook_secret_here
```

## 6. Test the Integration

### 6.1 Test Webhook

1. Start your application: `npm run dev`
2. Use ngrok to expose your local server:
   ```bash
   ngrok http 3000
   ```
3. Update your webhook URL in Meta Developer Console to the ngrok URL
4. Test the webhook by sending a message to your business number

### 6.2 Test Sending Messages

Use the WhatsApp API test tool in Meta Developer Console:

1. Go to WhatsApp → API Setup
2. In the "Send and receive messages" section
3. Enter a recipient phone number (must be registered with WhatsApp)
4. Send a test message

## 7. Message Templates

For production use, you need approved message templates for notifications.

### 7.1 Create Templates

1. Go to WhatsApp → Message Templates
2. Click "Create Template"
3. Create templates for:
   - Property alerts
   - Booking confirmations
   - Booking reminders

### Example Templates:

**Property Alert Template:**
```
Name: property_alert
Category: MARKETING
Language: English
Header: New Property Available
Body: 🏠 New property matching your preferences!

*{{1}}* in {{2}}
💰 {{3}}/month

Reply "VIEW" to see details or "BOOK" to schedule a tour.
Footer: Tenantsphere - Find Your Perfect Home
```

**Booking Confirmation Template:**
```
Name: booking_confirmation
Category: UTILITY
Language: English
Header: Booking Confirmed ✅
Body: Your property tour is confirmed!

📅 Date: {{1}}
🕐 Time: {{2}}
📍 Location: {{3}}
👨‍💼 Agent: {{4}}

We'll send you a reminder before your tour.
Footer: Tenantsphere - Find Your Perfect Home
```

## 8. Production Setup

### 8.1 Business Verification

1. Complete Facebook Business Verification
2. Submit your app for App Review
3. Request permissions for production use

### 8.2 Required Permissions

Request these permissions for production:
- `whatsapp_business_messaging`
- `whatsapp_business_management`
- `business_management`

### 8.3 Rate Limits

Be aware of rate limits:
- **Messaging**: 1000 messages per second
- **Registration**: 100 requests per second
- **Other APIs**: 200 requests per second

## 9. Security Best Practices

### 9.1 Webhook Security

1. Always verify webhook signatures
2. Use HTTPS for webhook URLs
3. Validate incoming data
4. Implement rate limiting

### 9.2 Access Token Security

1. Store access tokens securely
2. Use environment variables
3. Rotate tokens regularly
4. Monitor token usage

## 10. Monitoring and Analytics

### 10.1 Set Up Monitoring

1. Monitor webhook delivery success rates
2. Track message delivery and read rates
3. Monitor API error rates
4. Set up alerts for failures

### 10.2 Analytics

Track these metrics:
- Message volume
- Response rates
- User engagement
- Conversion rates (property views to bookings)

## 11. Troubleshooting

### Common Issues:

**Webhook not receiving messages:**
- Check webhook URL is accessible
- Verify webhook token matches
- Check webhook subscriptions
- Ensure HTTPS is used

**Messages not sending:**
- Check access token validity
- Verify phone number is registered
- Check message format compliance
- Review rate limits

**Template messages rejected:**
- Ensure templates are approved
- Check parameter count matches
- Verify template name spelling
- Review template policy compliance

### Debug Tools:

1. **Webhook Debugger**: Use Meta's webhook debugger
2. **API Explorer**: Test API calls directly
3. **Logs**: Check application logs for errors
4. **Postman**: Test API endpoints manually

## 12. Support Resources

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Meta Business Help Center](https://www.facebook.com/business/help)
- [WhatsApp Business API Support](https://developers.facebook.com/support)
- [Community Forums](https://developers.facebook.com/community)

## Next Steps

After completing this setup:

1. Test all message flows
2. Create and approve message templates
3. Implement proper error handling
4. Set up monitoring and alerts
5. Plan for scaling and production deployment

Your WhatsApp Business API integration should now be ready for Tenantsphere Lite!
