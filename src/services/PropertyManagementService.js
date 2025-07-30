const logger = require('../utils/logger');
const PropertyService = require('./PropertyService');
const UserService = require('./UserService');
const WhatsAppService = require('./WhatsAppService');

class PropertyManagementService {
  constructor() {
    this.propertyService = new PropertyService();
    this.userService = new UserService();
    this.whatsapp = new WhatsAppService();
  }

  // Add new property listing
  async addProperty(agentId, propertyData) {
    try {
      logger.info(`Adding new property for agent ${agentId}`);

      // Validate agent permissions
      const agent = await this.userService.getUserById(agentId);
      if (!agent || agent.role !== 'agent') {
        throw new Error('Unauthorized: Only agents can add properties');
      }

      // Validate required property data
      this.validatePropertyData(propertyData);

      // Create property with agent information
      const property = {
        ...propertyData,
        agentId: agentId,
        agent: {
          id: agentId,
          name: agent.name,
          phone: agent.phone,
          email: agent.email
        },
        status: 'pending_review',
        createdAt: new Date(),
        updatedAt: new Date(),
        verified: false,
        viewCount: 0,
        inquiryCount: 0
      };

      const propertyId = await this.propertyService.createProperty(property);
      
      logger.info(`Property ${propertyId} added successfully by agent ${agentId}`);
      
      // Notify agent of successful submission
      await this.notifyAgentPropertyAdded(agent, propertyId, property);

      return { propertyId, status: 'pending_review' };

    } catch (error) {
      logger.error('Error adding property:', error);
      throw error;
    }
  }

  // Update existing property
  async updateProperty(agentId, propertyId, updateData) {
    try {
      logger.info(`Updating property ${propertyId} by agent ${agentId}`);

      // Get existing property
      const existingProperty = await this.propertyService.getPropertyById(propertyId);
      if (!existingProperty) {
        throw new Error('Property not found');
      }

      // Verify agent ownership
      if (existingProperty.agentId !== agentId) {
        throw new Error('Unauthorized: You can only update your own properties');
      }

      // Validate update data
      this.validatePropertyUpdateData(updateData);

      // Update property
      const updatedProperty = {
        ...updateData,
        updatedAt: new Date(),
        status: existingProperty.status === 'approved' ? 'pending_review' : existingProperty.status
      };

      await this.propertyService.updateProperty(propertyId, updatedProperty);
      
      logger.info(`Property ${propertyId} updated successfully`);
      
      // Notify agent of successful update
      const agent = await this.userService.getUserById(agentId);
      await this.notifyAgentPropertyUpdated(agent, propertyId, updatedProperty);

      return { propertyId, status: updatedProperty.status };

    } catch (error) {
      logger.error('Error updating property:', error);
      throw error;
    }
  }

  // Delete property listing
  async deleteProperty(agentId, propertyId) {
    try {
      logger.info(`Deleting property ${propertyId} by agent ${agentId}`);

      // Get existing property
      const existingProperty = await this.propertyService.getPropertyById(propertyId);
      if (!existingProperty) {
        throw new Error('Property not found');
      }

      // Verify agent ownership
      if (existingProperty.agentId !== agentId) {
        throw new Error('Unauthorized: You can only delete your own properties');
      }

      // Soft delete - mark as deleted instead of removing
      await this.propertyService.updateProperty(propertyId, {
        status: 'deleted',
        deletedAt: new Date(),
        updatedAt: new Date()
      });
      
      logger.info(`Property ${propertyId} deleted successfully`);
      
      // Notify agent of successful deletion
      const agent = await this.userService.getUserById(agentId);
      await this.notifyAgentPropertyDeleted(agent, propertyId);

      return { propertyId, status: 'deleted' };

    } catch (error) {
      logger.error('Error deleting property:', error);
      throw error;
    }
  }

  // Get agent's properties
  async getAgentProperties(agentId, filters = {}) {
    try {
      const searchCriteria = {
        agentId: agentId,
        ...filters
      };

      // Don't include deleted properties by default
      if (!filters.includeDeleted) {
        searchCriteria.status = { $ne: 'deleted' };
      }

      const properties = await this.propertyService.searchProperties(searchCriteria);
      
      logger.info(`Retrieved ${properties.length} properties for agent ${agentId}`);
      
      return properties;

    } catch (error) {
      logger.error('Error getting agent properties:', error);
      throw error;
    }
  }

  // Get property analytics for agent
  async getPropertyAnalytics(agentId, propertyId = null) {
    try {
      const properties = propertyId 
        ? [await this.propertyService.getPropertyById(propertyId)]
        : await this.getAgentProperties(agentId);

      const analytics = {
        totalProperties: properties.length,
        activeProperties: properties.filter(p => p.status === 'approved').length,
        pendingProperties: properties.filter(p => p.status === 'pending_review').length,
        totalViews: properties.reduce((sum, p) => sum + (p.viewCount || 0), 0),
        totalInquiries: properties.reduce((sum, p) => sum + (p.inquiryCount || 0), 0),
        averageViews: 0,
        averageInquiries: 0,
        topPerformingProperties: [],
        recentActivity: []
      };

      if (analytics.totalProperties > 0) {
        analytics.averageViews = Math.round(analytics.totalViews / analytics.totalProperties);
        analytics.averageInquiries = Math.round(analytics.totalInquiries / analytics.totalProperties);
        
        // Get top performing properties
        analytics.topPerformingProperties = properties
          .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
          .slice(0, 5)
          .map(p => ({
            id: p.id,
            title: p.title || `${p.type} in ${p.location}`,
            views: p.viewCount || 0,
            inquiries: p.inquiryCount || 0
          }));
      }

      return analytics;

    } catch (error) {
      logger.error('Error getting property analytics:', error);
      throw error;
    }
  }

  // Approve property (admin function)
  async approveProperty(adminId, propertyId) {
    try {
      logger.info(`Approving property ${propertyId} by admin ${adminId}`);

      // Verify admin permissions
      const admin = await this.userService.getUserById(adminId);
      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Only admins can approve properties');
      }

      // Update property status
      await this.propertyService.updateProperty(propertyId, {
        status: 'approved',
        verified: true,
        approvedAt: new Date(),
        approvedBy: adminId,
        updatedAt: new Date()
      });

      // Get property and agent details
      const property = await this.propertyService.getPropertyById(propertyId);
      const agent = await this.userService.getUserById(property.agentId);

      // Notify agent of approval
      await this.notifyAgentPropertyApproved(agent, propertyId, property);

      logger.info(`Property ${propertyId} approved successfully`);
      
      return { propertyId, status: 'approved' };

    } catch (error) {
      logger.error('Error approving property:', error);
      throw error;
    }
  }

  // Reject property (admin function)
  async rejectProperty(adminId, propertyId, reason) {
    try {
      logger.info(`Rejecting property ${propertyId} by admin ${adminId}`);

      // Verify admin permissions
      const admin = await this.userService.getUserById(adminId);
      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Only admins can reject properties');
      }

      // Update property status
      await this.propertyService.updateProperty(propertyId, {
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: new Date(),
        rejectedBy: adminId,
        updatedAt: new Date()
      });

      // Get property and agent details
      const property = await this.propertyService.getPropertyById(propertyId);
      const agent = await this.userService.getUserById(property.agentId);

      // Notify agent of rejection
      await this.notifyAgentPropertyRejected(agent, propertyId, property, reason);

      logger.info(`Property ${propertyId} rejected successfully`);
      
      return { propertyId, status: 'rejected', reason };

    } catch (error) {
      logger.error('Error rejecting property:', error);
      throw error;
    }
  }

  // Validate property data
  validatePropertyData(propertyData) {
    const required = ['title', 'location', 'type', 'price', 'description'];
    const missing = required.filter(field => !propertyData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (propertyData.price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    if (propertyData.bedrooms !== undefined && propertyData.bedrooms < 0) {
      throw new Error('Bedrooms cannot be negative');
    }

    if (propertyData.bathrooms !== undefined && propertyData.bathrooms < 0) {
      throw new Error('Bathrooms cannot be negative');
    }
  }

  // Validate property update data
  validatePropertyUpdateData(updateData) {
    if (updateData.price !== undefined && updateData.price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    if (updateData.bedrooms !== undefined && updateData.bedrooms < 0) {
      throw new Error('Bedrooms cannot be negative');
    }

    if (updateData.bathrooms !== undefined && updateData.bathrooms < 0) {
      throw new Error('Bathrooms cannot be negative');
    }
  }

  // Notify agent of property addition
  async notifyAgentPropertyAdded(agent, propertyId, property) {
    try {
      if (agent.phone) {
        const message = `✅ *Property Added Successfully*\n\n🏠 *${property.title || property.type}*\n📍 ${property.location}\n💰 ${this.formatPrice(property.price)} FCFA\n\n📋 *Status:* Pending Review\n🆔 *Property ID:* ${propertyId}\n\nYour property has been submitted for review. You'll be notified once it's approved and live on the platform.`;
        
        await this.whatsapp.sendTextMessage(agent.phone, message);
      }
    } catch (error) {
      logger.warn('Could not notify agent of property addition:', error.message);
    }
  }

  // Notify agent of property update
  async notifyAgentPropertyUpdated(agent, propertyId, property) {
    try {
      if (agent.phone) {
        const message = `📝 *Property Updated Successfully*\n\n🆔 *Property ID:* ${propertyId}\n📋 *Status:* ${property.status}\n\nYour property has been updated and is under review.`;
        
        await this.whatsapp.sendTextMessage(agent.phone, message);
      }
    } catch (error) {
      logger.warn('Could not notify agent of property update:', error.message);
    }
  }

  // Notify agent of property deletion
  async notifyAgentPropertyDeleted(agent, propertyId) {
    try {
      if (agent.phone) {
        const message = `🗑️ *Property Deleted*\n\n🆔 *Property ID:* ${propertyId}\n\nYour property has been removed from the platform.`;
        
        await this.whatsapp.sendTextMessage(agent.phone, message);
      }
    } catch (error) {
      logger.warn('Could not notify agent of property deletion:', error.message);
    }
  }

  // Notify agent of property approval
  async notifyAgentPropertyApproved(agent, propertyId, property) {
    try {
      if (agent.phone) {
        const message = `🎉 *Property Approved!*\n\n🏠 *${property.title || property.type}*\n📍 ${property.location}\n🆔 *Property ID:* ${propertyId}\n\n✅ Your property is now live on TenantSphere and visible to potential tenants!`;
        
        await this.whatsapp.sendTextMessage(agent.phone, message);
      }
    } catch (error) {
      logger.warn('Could not notify agent of property approval:', error.message);
    }
  }

  // Notify agent of property rejection
  async notifyAgentPropertyRejected(agent, propertyId, property, reason) {
    try {
      if (agent.phone) {
        const message = `❌ *Property Rejected*\n\n🏠 *${property.title || property.type}*\n🆔 *Property ID:* ${propertyId}\n\n📝 *Reason:* ${reason}\n\nPlease update your property listing and resubmit for review.`;
        
        await this.whatsapp.sendTextMessage(agent.phone, message);
      }
    } catch (error) {
      logger.warn('Could not notify agent of property rejection:', error.message);
    }
  }

  // Format price with proper comma separation
  formatPrice(price) {
    if (!price) return 'Price on request';
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

module.exports = PropertyManagementService;
