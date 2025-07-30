# 🏠 TenantSphere Property Listing Guide

## Overview

TenantSphere provides multiple ways for property owners and agents to list their properties. Here's a comprehensive guide on how properties are listed and managed in the system.

## 🎯 Property Listing Methods

### 1. **Web Interface (Recommended)**
- **URL**: `http://localhost:3000`
- **Features**: User-friendly form with validation
- **Best for**: Individual property listings
- **Access**: Open to all agents and property owners

### 2. **REST API**
- **Endpoint**: `POST /api/properties`
- **Features**: Programmatic access for bulk operations
- **Best for**: Integration with existing systems
- **Access**: Requires API knowledge

### 3. **Bulk Import (Coming Soon)**
- **Method**: CSV/Excel file upload
- **Features**: Import hundreds of properties at once
- **Best for**: Large property portfolios
- **Access**: Admin interface

## 📋 Property Information Required

### **Essential Information** ⭐
- **Title**: Descriptive property name
- **Location**: Specific area in Buea (e.g., "Molyko", "Great Soppo")
- **Price**: Monthly rent in FCFA
- **Property Type**: apartment, house, studio, duplex, villa, room

### **Additional Details** 📝
- **Bedrooms**: Number of bedrooms (0 for studio)
- **Bathrooms**: Number of bathrooms
- **Description**: Detailed property description
- **Amenities**: Available facilities (comma-separated)
- **Agent Information**: Name and phone number

### **System-Generated** 🤖
- **Property ID**: Unique identifier
- **Creation Date**: When property was listed
- **Status**: available, rented, pending, deleted
- **Verification Status**: Verified by admin
- **Search Keywords**: Auto-generated for better searchability

## 🌐 Using the Web Interface

### Step 1: Access the Dashboard
```
http://localhost:3000
```

### Step 2: Fill Property Details
1. **Basic Information**
   - Property title (e.g., "Modern 2-Bedroom Apartment in Molyko")
   - Property type (dropdown selection)
   - Location (specific area in Buea)
   - Monthly rent in FCFA

2. **Property Features**
   - Number of bedrooms
   - Number of bathrooms
   - Property description

3. **Amenities**
   - List amenities separated by commas
   - Examples: "wifi, parking, generator, garden, security"

4. **Agent Information**
   - Agent name
   - Contact phone number

### Step 3: Submit Property
- Click "Add Property" button
- System validates all information
- Property is added to database
- Confirmation message displayed

## 🔧 Using the REST API

### Create Property
```http
POST /api/properties
Content-Type: application/json

{
  "title": "Modern 2-Bedroom Apartment in Molyko",
  "description": "Beautiful apartment with mountain views",
  "location": "Molyko, Buea",
  "propertyType": "apartment",
  "price": 75000,
  "bedrooms": 2,
  "bathrooms": 1,
  "amenities": ["wifi", "parking", "generator"],
  "agentName": "John Doe",
  "agentPhone": "+237671234567"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "prop_1234567890",
    "title": "Modern 2-Bedroom Apartment in Molyko",
    "status": "available",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "message": "Property created successfully"
}
```

### Get All Properties
```http
GET /api/properties?page=1&limit=20&location=Molyko
```

### Search Properties
```http
GET /api/properties/search?q=apartment&minPrice=50000&maxPrice=100000
```

### Update Property
```http
PUT /api/properties/{id}
Content-Type: application/json

{
  "price": 80000,
  "status": "rented"
}
```

### Delete Property
```http
DELETE /api/properties/{id}
```

## 🗂️ Property Data Structure

```javascript
{
  id: "prop_1234567890",
  title: "Modern 2-Bedroom Apartment in Molyko",
  description: "Beautiful apartment with mountain views",
  location: "Molyko, Buea",
  propertyType: "apartment", // apartment, house, studio, duplex, villa, room
  price: 75000, // Monthly rent in FCFA
  bedrooms: 2,
  bathrooms: 1,
  amenities: ["wifi", "parking", "generator"],
  
  // Agent Information
  agentName: "John Doe",
  agentPhone: "+237671234567",
  agentId: "agent_123", // Optional
  
  // System Fields
  status: "available", // available, rented, pending, deleted
  verified: false, // Admin verification status
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:30:00Z",
  
  // Search Optimization
  title_keywords: ["modern", "bedroom", "apartment", "molyko"],
  location_keywords: ["molyko", "buea"],
  description_keywords: ["beautiful", "apartment", "mountain", "views"],
  
  // Optional Fields
  images: ["url1", "url2"], // Property images
  coordinates: { lat: 4.1536, lng: 9.2325 }, // GPS coordinates
  features: ["balcony", "furnished"], // Additional features
  policies: ["no_pets", "no_smoking"] // Property policies
}
```

## 🎯 Property Categories

### **By Type**
- **Apartment**: Multi-unit buildings
- **House**: Standalone houses
- **Studio**: Single-room units
- **Duplex**: Two-level units
- **Villa**: Luxury houses
- **Room**: Single rooms with shared facilities

### **By Price Range**
- **Budget**: 15,000 - 40,000 FCFA
- **Mid-range**: 40,000 - 100,000 FCFA
- **Premium**: 100,000 - 200,000 FCFA
- **Luxury**: 200,000+ FCFA

### **By Location**
- **Molyko**: University area
- **Great Soppo**: Residential area
- **Buea Town**: Commercial center
- **Mile 16**: Student area
- **Bonduma**: Upscale area
- **Muea**: Budget-friendly area

## 🚀 Quick Start: Add Sample Properties

### Option 1: Run the Seeder Script
```bash
node scripts/seed-properties.js
```
This adds 10 sample properties to your database.

### Option 2: Use the Web Interface
1. Visit `http://localhost:3000`
2. Click "Add Property" tab
3. Fill in the form
4. Submit

### Option 3: Use the API
```bash
curl -X POST http://localhost:3000/api/properties \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Property",
    "location": "Molyko, Buea",
    "propertyType": "apartment",
    "price": 50000
  }'
```

## 📊 Property Management Features

### **Status Management**
- **Available**: Ready for rent
- **Rented**: Currently occupied
- **Pending**: Under negotiation
- **Deleted**: Soft-deleted (hidden)

### **Verification System**
- Properties require admin verification
- Verified properties appear in search results
- Unverified properties are marked accordingly

### **Search Optimization**
- Auto-generated keywords for better search
- Location-based indexing
- Price range categorization
- Amenity-based filtering

## 🔍 How Properties Appear to Users

### **WhatsApp Bot Integration**
- Users search via natural language
- Bot returns matching properties
- Interactive buttons for actions
- Booking system integration

### **Search Results Format**
```
🏠 Modern 2-Bedroom Apartment in Molyko
📍 Molyko, Buea
💰 75,000 FCFA/month
🛏️ 2 bedrooms • 🚿 1 bathroom
✨ wifi, parking, generator

[View Details] [Save Property] [Book Tour]
```

## 🛠️ Advanced Features

### **Bulk Operations**
- Import from CSV/Excel
- Bulk status updates
- Mass property verification

### **Analytics**
- Property view statistics
- Popular locations
- Price trends
- Agent performance

### **Integration**
- WhatsApp Business API
- Firebase real-time updates
- Image upload system
- GPS coordinates

## 📞 Support

For help with property listing:
- Check the web interface at `http://localhost:3000`
- Review API documentation
- Contact system administrator
- Join the TenantSphere community

---

**Ready to list your first property? Start with the web interface at `http://localhost:3000`! 🏠✨**
