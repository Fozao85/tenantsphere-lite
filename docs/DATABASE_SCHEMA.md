# Database Schema - Tenantsphere Lite

This document describes the complete database schema for the Tenantsphere Lite WhatsApp rental system.

## Overview

The system uses Firebase Firestore as the primary database with the following collections:

- **Properties** - Rental property listings
- **Users** - Tenant information and preferences  
- **Agents** - Real estate agent profiles
- **Bookings** - Property tour appointments
- **Conversations** - WhatsApp chat history and state
- **Notifications** - Notification queue and delivery tracking

## Collection Schemas

### Properties Collection

Stores rental property listings managed by agents.

```javascript
{
  id: "uuid",                          // Unique property identifier
  title: "2-Bedroom Apartment in Molyko",
  description: "Modern apartment with great amenities...",
  location: "Molyko, Buea",
  price: 75000,                        // Monthly rent in XAF
  currency: "XAF",
  bedrooms: 2,
  bathrooms: 1,
  size: 85,                           // Square meters
  propertyType: "apartment",          // apartment, house, studio, etc.
  status: "available",                // available, booked, taken
  images: [                           // Array of image URLs
    "https://cloudinary.com/image1.jpg",
    "https://cloudinary.com/image2.jpg"
  ],
  amenities: [                        // Array of amenities
    "wifi", "parking", "security", "water"
  ],
  agentId: "agent-uuid",              // Reference to managing agent
  contactInfo: {
    phone: "+237123456789",
    email: "agent@example.com",
    whatsapp: "+237123456789"
  },
  coordinates: {                      // GPS coordinates
    lat: 4.1536,
    lng: 9.2325
  },
  nearbyLandmarks: [                  // Nearby points of interest
    "University of Buea", "Checkpoint"
  ],
  availableFrom: "2024-08-01",        // ISO date string
  viewCount: 0,                       // Number of times viewed
  bookingCount: 0,                    // Number of bookings made
  createdAt: "2024-07-24T10:00:00Z",  // Timestamp
  updatedAt: "2024-07-24T10:00:00Z",  // Timestamp
  
  // Search optimization fields
  title_keywords: ["bedroom", "apartment", "molyko"],
  location_keywords: ["molyko", "buea"],
  description_keywords: ["modern", "amenities"]
}
```

### Users Collection

Stores tenant information, preferences, and interaction history.

```javascript
{
  id: "uuid",                          // Unique user identifier
  phone: "+237123456789",              // Phone number (Cameroon format)
  name: "John Doe",
  whatsappId: "237123456789",          // WhatsApp ID (wa_id)
  optedIn: true,                       // Consent for notifications
  preferences: {
    maxPrice: 100000,                  // Maximum budget in XAF
    minPrice: 50000,                   // Minimum budget in XAF
    preferredLocations: ["Molyko", "Mile 16"],
    propertyTypes: ["apartment", "house"],
    minBedrooms: 1,
    maxBedrooms: 3,
    amenities: ["wifi", "parking"]
  },
  bookings: [                          // Array of booking IDs
    "booking-uuid-1", "booking-uuid-2"
  ],
  viewedProperties: [                  // Array of viewed property IDs
    "property-uuid-1", "property-uuid-2"
  ],
  lastInteraction: "2024-07-24T10:00:00Z",
  conversationState: "idle",           // idle, searching, booking, etc.
  language: "en",                      // en, fr
  isActive: true,
  createdAt: "2024-07-24T10:00:00Z",
  updatedAt: "2024-07-24T10:00:00Z"
}
```

### Agents Collection

Stores real estate agent profiles and business information.

```javascript
{
  id: "uuid",                          // Unique agent identifier
  name: "Jane Smith",
  email: "jane@realestate.com",
  phone: "+237123456789",
  whatsappId: "237123456789",          // Agent's WhatsApp ID
  company: "Buea Properties Ltd",
  licenseNumber: "RE-2024-001",
  profileImage: "https://cloudinary.com/agent.jpg",
  bio: "Experienced real estate agent specializing in...",
  specializations: ["residential", "commercial"],
  serviceAreas: ["Molyko", "Mile 16", "Bonduma"],
  languages: ["en", "fr"],
  rating: 4.5,                         // Average rating (0-5)
  totalReviews: 23,
  totalProperties: 15,                 // Number of properties managed
  totalBookings: 45,                   // Total bookings handled
  isVerified: true,                    // Verification status
  isActive: true,
  joinedAt: "2024-01-15T10:00:00Z",
  lastActive: "2024-07-24T09:30:00Z",
  contactPreferences: {
    whatsapp: true,
    email: true,
    phone: true,
    preferredTime: "business_hours"    // business_hours, anytime, evening
  },
  businessHours: {
    monday: { open: "08:00", close: "18:00", isOpen: true },
    tuesday: { open: "08:00", close: "18:00", isOpen: true },
    wednesday: { open: "08:00", close: "18:00", isOpen: true },
    thursday: { open: "08:00", close: "18:00", isOpen: true },
    friday: { open: "08:00", close: "18:00", isOpen: true },
    saturday: { open: "09:00", close: "16:00", isOpen: true },
    sunday: { open: "10:00", close: "14:00", isOpen: false }
  },
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-07-24T10:00:00Z"
}
```

### Bookings Collection

Stores property tour appointments and their status.

```javascript
{
  id: "uuid",                          // Unique booking identifier
  propertyId: "property-uuid",         // Reference to property
  userId: "user-uuid",                 // Reference to user
  agentId: "agent-uuid",               // Reference to agent
  type: "tour",                        // tour, viewing, inspection
  status: "confirmed",                 // pending, confirmed, completed, cancelled, no_show
  scheduledDate: "2024-07-25",         // ISO date string
  scheduledTime: "14:00",              // HH:MM format
  duration: 30,                        // Duration in minutes
  notes: "Interested in the kitchen layout",
  agentNotes: "Client seems serious, follow up needed",
  meetingPoint: "Property main entrance",
  contactMethod: "whatsapp",           // whatsapp, phone, email
  reminderSent: false,
  feedback: "Great property, very interested",
  rating: 5,                           // User rating (1-5)
  attendees: {
    count: 2,
    names: ["John Doe", "Jane Doe"],
    relationships: ["self", "spouse"]
  },
  followUp: {
    required: true,
    completed: false,
    scheduledDate: "2024-07-26",
    notes: "Follow up on financing options"
  },
  createdAt: "2024-07-24T10:00:00Z",
  updatedAt: "2024-07-24T10:00:00Z",
  confirmedAt: "2024-07-24T10:30:00Z",
  completedAt: null,
  cancelledAt: null,
  cancellationReason: null
}
```

### Conversations Collection

Stores WhatsApp conversation history and current state.

```javascript
{
  id: "uuid",                          // Unique conversation identifier
  userId: "user-uuid",                 // Reference to user
  whatsappId: "237123456789",          // WhatsApp user ID
  status: "active",                    // active, paused, ended
  currentFlow: "property_search",      // welcome, property_search, booking, preferences
  currentStep: "location_selection",   // Current step in the flow
  context: {                           // Current conversation context
    searchCriteria: {
      location: "Molyko",
      maxPrice: 80000
    },
    lastPropertyShown: "property-uuid",
    awaitingResponse: "location_preference"
  },
  language: "en",
  lastMessageAt: "2024-07-24T10:00:00Z",
  recentMessages: [                    // Last 20 messages for context
    {
      id: "msg-uuid",
      timestamp: "2024-07-24T10:00:00Z",
      type: "text",
      direction: "incoming",           // incoming, outgoing
      content: "I'm looking for a 2-bedroom apartment",
      metadata: {}
    }
  ],
  totalMessages: 15,
  discoveredPreferences: {             // Preferences learned during chat
    budget: 75000,
    location: "Molyko",
    propertyType: "apartment",
    bedrooms: 2,
    amenities: ["wifi", "parking"]
  },
  session: {
    startedAt: "2024-07-24T09:45:00Z",
    lastActivity: "2024-07-24T10:00:00Z",
    messageCount: 8,
    propertiesShown: ["prop-1", "prop-2"],
    bookingsCreated: ["booking-1"]
  },
  metrics: {
    responseTime: [2.5, 1.8, 3.2],     // Response times in seconds
    userSatisfaction: 4,               // 1-5 rating
    goalCompleted: false,
    goalType: null                     // property_found, booking_made, info_provided
  },
  createdAt: "2024-07-24T09:45:00Z",
  updatedAt: "2024-07-24T10:00:00Z"
}
```

### Notifications Collection

Stores notification queue and delivery tracking.

```javascript
{
  id: "uuid",                          // Unique notification identifier
  userId: "user-uuid",                 // Reference to user
  type: "property_alert",              // property_alert, booking_reminder, booking_confirmation
  title: "New Property Available",
  message: "🏠 New property matching your preferences!...",
  data: {                              // Additional structured data
    propertyId: "property-uuid",
    propertyTitle: "2-Bedroom Apartment",
    propertyLocation: "Molyko",
    propertyPrice: 75000
  },
  channel: "whatsapp",                 // whatsapp, email, sms
  status: "delivered",                 // pending, sent, delivered, failed, read
  priority: "high",                    // low, normal, high, urgent
  scheduledFor: "2024-07-24T14:00:00Z", // When to send (null for immediate)
  sentAt: "2024-07-24T14:00:05Z",
  deliveredAt: "2024-07-24T14:00:08Z",
  readAt: "2024-07-24T14:02:15Z",
  failureReason: null,
  retryCount: 0,
  maxRetries: 3,
  template: {                          // WhatsApp template info
    name: "property_alert",
    language: "en",
    parameters: ["2-Bedroom Apartment", "Molyko", "75,000 XAF"]
  },
  tracking: {
    messageId: "msg-uuid",
    whatsappMessageId: "wamid.xxx",
    conversationId: "conv-uuid"
  },
  createdAt: "2024-07-24T13:55:00Z",
  updatedAt: "2024-07-24T14:02:15Z"
}
```

## Relationships

### One-to-Many Relationships
- **Agent → Properties**: One agent manages many properties
- **User → Bookings**: One user can have many bookings
- **Agent → Bookings**: One agent handles many bookings
- **Property → Bookings**: One property can have many bookings
- **User → Conversations**: One user can have many conversations
- **User → Notifications**: One user receives many notifications

### Many-to-Many Relationships
- **Users ↔ Properties**: Users can view many properties, properties can be viewed by many users (tracked via viewedProperties array)

## Indexes

### Required Composite Indexes

```javascript
// Properties
{ status: "asc", createdAt: "desc" }
{ agentId: "asc", status: "asc", createdAt: "desc" }
{ propertyType: "asc", status: "asc", price: "asc" }

// Bookings  
{ userId: "asc", status: "asc", scheduledDate: "asc" }
{ agentId: "asc", status: "asc", scheduledDate: "asc" }
{ propertyId: "asc", status: "asc", scheduledDate: "asc" }

// Conversations
{ userId: "asc", status: "asc", lastMessageAt: "desc" }
{ whatsappId: "asc", status: "asc" }

// Notifications
{ userId: "asc", status: "asc", scheduledFor: "asc" }
{ status: "asc", scheduledFor: "asc", priority: "desc" }
```

## Data Validation

All models include validation methods that check:
- Required fields
- Data types and formats
- Business logic constraints
- Referential integrity

## Security Considerations

- User data is isolated by userId
- Agents can only modify their own properties
- Bookings are accessible only to involved parties
- Conversations are private to the user
- Notifications are private to the recipient
