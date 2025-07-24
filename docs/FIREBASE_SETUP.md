# Firebase Setup Guide for Tenantsphere Lite

This guide will help you set up Firebase for the Tenantsphere Lite project.

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `tenantsphere-lite`
4. Enable Google Analytics (optional)
5. Click "Create project"

## 2. Set up Firestore Database

1. In the Firebase console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (we'll configure security rules later)
4. Select a location close to your users (e.g., `europe-west3` for Europe/Africa)
5. Click "Done"

## 3. Create Service Account

1. Go to Project Settings (gear icon) → "Service accounts"
2. Click "Generate new private key"
3. Download the JSON file
4. Keep this file secure - it contains your private keys

## 4. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in the Firebase configuration from your service account JSON:
   ```env
   # Firebase Configuration
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY_ID=your-private-key-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_CLIENT_ID=your-client-id
   ```

## 5. Database Collections Structure

The following collections will be created automatically when you start using the app:

### Properties Collection (`properties`)
- Stores rental property listings
- Fields: title, description, location, price, bedrooms, bathrooms, etc.
- Indexes: status, agentId, propertyType, price, location

### Users Collection (`users`)
- Stores tenant information and preferences
- Fields: phone, name, whatsappId, preferences, bookings, etc.
- Indexes: whatsappId, phone, optedIn

### Agents Collection (`agents`)
- Stores real estate agent information
- Fields: name, email, phone, company, specializations, etc.
- Indexes: email, phone, isActive, serviceAreas

### Bookings Collection (`bookings`)
- Stores property tour bookings
- Fields: propertyId, userId, agentId, scheduledDate, status, etc.
- Indexes: userId, agentId, propertyId, status, scheduledDate

### Conversations Collection (`conversations`)
- Stores WhatsApp conversation history and state
- Fields: userId, whatsappId, currentFlow, messages, etc.
- Indexes: userId, whatsappId, status, lastMessageAt

### Notifications Collection (`notifications`)
- Stores notification queue and history
- Fields: userId, type, message, status, scheduledFor, etc.
- Indexes: userId, status, scheduledFor, type

## 6. Security Rules

After setting up, update Firestore security rules in the Firebase console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Properties - read by all, write by agents only
    match /properties/{propertyId} {
      allow read: if true;
      allow write: if request.auth != null && 
        (request.auth.token.role == 'agent' || request.auth.token.role == 'admin');
    }
    
    // Users - read/write by owner only
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Agents - read by all, write by owner/admin only
    match /agents/{agentId} {
      allow read: if true;
      allow write: if request.auth != null && 
        (request.auth.uid == agentId || request.auth.token.role == 'admin');
    }
    
    // Bookings - read/write by involved parties
    match /bookings/{bookingId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         request.auth.uid == resource.data.agentId ||
         request.auth.token.role == 'admin');
    }
    
    // Conversations - read/write by owner only
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Notifications - read/write by owner only
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

## 7. Indexes

Create the following composite indexes in Firestore:

### Properties
- Collection: `properties`
- Fields: `status` (Ascending), `createdAt` (Descending)
- Fields: `agentId` (Ascending), `status` (Ascending), `createdAt` (Descending)
- Fields: `propertyType` (Ascending), `status` (Ascending), `price` (Ascending)

### Bookings
- Collection: `bookings`
- Fields: `userId` (Ascending), `status` (Ascending), `scheduledDate` (Ascending)
- Fields: `agentId` (Ascending), `status` (Ascending), `scheduledDate` (Ascending)
- Fields: `propertyId` (Ascending), `status` (Ascending), `scheduledDate` (Ascending)

### Conversations
- Collection: `conversations`
- Fields: `userId` (Ascending), `status` (Ascending), `lastMessageAt` (Descending)
- Fields: `whatsappId` (Ascending), `status` (Ascending)

### Notifications
- Collection: `notifications`
- Fields: `userId` (Ascending), `status` (Ascending), `scheduledFor` (Ascending)
- Fields: `status` (Ascending), `scheduledFor` (Ascending), `priority` (Descending)

## 8. Test the Connection

Run the application to test the Firebase connection:

```bash
npm run dev
```

You should see:
```
✅ Firebase initialized successfully
🚀 Tenantsphere Lite server running on port 3000
```

## 9. Backup and Monitoring

1. **Enable Firestore Backup**: Go to Firestore → Backup and restore
2. **Set up Monitoring**: Go to Monitoring to track usage and performance
3. **Configure Alerts**: Set up alerts for quota usage and errors

## 10. Production Considerations

1. **Security Rules**: Update rules to be more restrictive in production
2. **Indexes**: Monitor and optimize indexes based on actual query patterns
3. **Backup Strategy**: Set up automated backups
4. **Monitoring**: Set up comprehensive monitoring and alerting
5. **Rate Limiting**: Implement rate limiting to prevent abuse

## Troubleshooting

### Common Issues

1. **"Service account object must contain a string 'project_id' property"**
   - Check that FIREBASE_PROJECT_ID is set correctly in .env
   - Ensure the service account JSON is valid

2. **"Permission denied"**
   - Check Firestore security rules
   - Ensure the service account has the correct permissions

3. **"Collection not found"**
   - Collections are created automatically when first document is added
   - Check collection names in src/config/firebase.js

### Getting Help

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Support](https://firebase.google.com/support)
