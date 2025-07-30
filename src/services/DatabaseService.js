const { getFirestore, collections } = require('../config/firebase');
const { logger } = require('../utils/logger');

class DatabaseService {
  constructor() {
    try {
      this.db = getFirestore();
      this.isAvailable = true;
    } catch (error) {
      logger.warn('Firebase not available, using mock database:', error.message);
      this.db = this.createMockDatabase();
      this.isAvailable = false;
    }
  }

  // Create a mock database for testing/development
  createMockDatabase() {
    const mockData = new Map();

    // Add some sample properties for testing
    this.addSampleProperties(mockData);

    return {
      collection: (collectionName) => ({
        doc: (id) => ({
          get: async () => {
            const key = `${collectionName}/${id}`;
            const data = mockData.get(key);
            return {
              exists: !!data,
              id: id,
              data: () => data || {}
            };
          },
          set: async (data) => {
            const key = `${collectionName}/${id}`;
            mockData.set(key, data);
            return { id };
          },
          update: async (data) => {
            const key = `${collectionName}/${id}`;
            const existing = mockData.get(key) || {};
            mockData.set(key, { ...existing, ...data });
            return { id };
          },
          delete: async () => {
            const key = `${collectionName}/${id}`;
            mockData.delete(key);
            return { id };
          }
        }),
        add: async (data) => {
          const id = 'mock_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          const key = `${collectionName}/${id}`;
          mockData.set(key, data);
          return { id };
        },
        get: async () => {
          const docs = [];
          for (const [key, data] of mockData.entries()) {
            if (key.startsWith(`${collectionName}/`)) {
              const id = key.split('/')[1];
              docs.push({
                id,
                data: () => data,
                exists: true
              });
            }
          }
          return {
            empty: docs.length === 0,
            docs,
            forEach: (callback) => docs.forEach(callback)
          };
        },
        where: function(field, operator, value) {
          const query = {
            _filters: [...(this._filters || []), { field, operator, value }],
            _orderBy: this._orderBy,
            _limit: this._limit,
            where: function(field, operator, value) {
              return {
                ...this,
                _filters: [...(this._filters || []), { field, operator, value }]
              };
            },
            orderBy: function(field, direction = 'asc') {
              return {
                ...this,
                _orderBy: { field, direction }
              };
            },
            limit: function(limitValue) {
              return {
                ...this,
                _limit: limitValue
              };
            },
            get: async function() {
              let docs = [];
              for (const [key, data] of mockData.entries()) {
                if (key.startsWith(`${collectionName}/`)) {
                  const id = key.split('/')[1];
                  docs.push({
                    id,
                    data: () => data,
                    exists: true
                  });
                }
              }

              // Apply filters
              if (this._filters) {
                docs = docs.filter(doc => {
                  const data = doc.data();
                  return this._filters.every(filter => {
                    const fieldValue = data[filter.field];
                    switch (filter.operator) {
                      case '==': return fieldValue === filter.value;
                      case '!=': return fieldValue !== filter.value;
                      case '>': return fieldValue > filter.value;
                      case '>=': return fieldValue >= filter.value;
                      case '<': return fieldValue < filter.value;
                      case '<=': return fieldValue <= filter.value;
                      case 'in': return filter.value.includes(fieldValue);
                      case 'array-contains': return Array.isArray(fieldValue) && fieldValue.includes(filter.value);
                      default: return true;
                    }
                  });
                });
              }

              // Apply ordering
              if (this._orderBy) {
                docs.sort((a, b) => {
                  const aVal = a.data()[this._orderBy.field];
                  const bVal = b.data()[this._orderBy.field];
                  const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                  return this._orderBy.direction === 'desc' ? -comparison : comparison;
                });
              }

              // Apply limit
              if (this._limit) {
                docs = docs.slice(0, this._limit);
              }

              return {
                empty: docs.length === 0,
                docs,
                forEach: (callback) => docs.forEach(callback)
              };
            }
          };
          return query;
        },
        orderBy: function(field, direction = 'asc') {
          return {
            _orderBy: { field, direction },
            _filters: this._filters,
            _limit: this._limit,
            where: function(field, operator, value) {
              return {
                ...this,
                _filters: [...(this._filters || []), { field, operator, value }]
              };
            },
            orderBy: function(field, direction = 'asc') {
              return {
                ...this,
                _orderBy: { field, direction }
              };
            },
            limit: function(limitValue) {
              return {
                ...this,
                _limit: limitValue
              };
            },
            get: async function() {
              let docs = [];
              for (const [key, data] of mockData.entries()) {
                if (key.startsWith(`${collectionName}/`)) {
                  const id = key.split('/')[1];
                  docs.push({
                    id,
                    data: () => data,
                    exists: true
                  });
                }
              }

              // Apply filters
              if (this._filters) {
                docs = docs.filter(doc => {
                  const data = doc.data();
                  return this._filters.every(filter => {
                    const fieldValue = data[filter.field];
                    switch (filter.operator) {
                      case '==': return fieldValue === filter.value;
                      case '!=': return fieldValue !== filter.value;
                      case '>': return fieldValue > filter.value;
                      case '>=': return fieldValue >= filter.value;
                      case '<': return fieldValue < filter.value;
                      case '<=': return fieldValue <= filter.value;
                      case 'in': return filter.value.includes(fieldValue);
                      case 'array-contains': return Array.isArray(fieldValue) && fieldValue.includes(filter.value);
                      default: return true;
                    }
                  });
                });
              }

              // Apply ordering
              if (this._orderBy) {
                docs.sort((a, b) => {
                  const aVal = a.data()[this._orderBy.field];
                  const bVal = b.data()[this._orderBy.field];
                  const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                  return this._orderBy.direction === 'desc' ? -comparison : comparison;
                });
              }

              // Apply limit
              if (this._limit) {
                docs = docs.slice(0, this._limit);
              }

              return {
                empty: docs.length === 0,
                docs,
                forEach: (callback) => docs.forEach(callback)
              };
            }
          };
        },
        limit: function(limitValue) {
          return {
            _limit: limitValue,
            _filters: this._filters,
            _orderBy: this._orderBy,
            where: function(field, operator, value) {
              return {
                ...this,
                _filters: [...(this._filters || []), { field, operator, value }]
              };
            },
            orderBy: function(field, direction = 'asc') {
              return {
                ...this,
                _orderBy: { field, direction }
              };
            },
            limit: function(limitValue) {
              return {
                ...this,
                _limit: limitValue
              };
            },
            get: async function() {
              let docs = [];
              for (const [key, data] of mockData.entries()) {
                if (key.startsWith(`${collectionName}/`)) {
                  const id = key.split('/')[1];
                  docs.push({
                    id,
                    data: () => data,
                    exists: true
                  });
                }
              }

              // Apply filters
              if (this._filters) {
                docs = docs.filter(doc => {
                  const data = doc.data();
                  return this._filters.every(filter => {
                    const fieldValue = data[filter.field];
                    switch (filter.operator) {
                      case '==': return fieldValue === filter.value;
                      case '!=': return fieldValue !== filter.value;
                      case '>': return fieldValue > filter.value;
                      case '>=': return fieldValue >= filter.value;
                      case '<': return fieldValue < filter.value;
                      case '<=': return fieldValue <= filter.value;
                      case 'in': return filter.value.includes(fieldValue);
                      case 'array-contains': return Array.isArray(fieldValue) && fieldValue.includes(filter.value);
                      default: return true;
                    }
                  });
                });
              }

              // Apply ordering
              if (this._orderBy) {
                docs.sort((a, b) => {
                  const aVal = a.data()[this._orderBy.field];
                  const bVal = b.data()[this._orderBy.field];
                  const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                  return this._orderBy.direction === 'desc' ? -comparison : comparison;
                });
              }

              // Apply limit
              if (this._limit) {
                docs = docs.slice(0, this._limit);
              }

              return {
                empty: docs.length === 0,
                docs,
                forEach: (callback) => docs.forEach(callback)
              };
            }
          };
        }
      })
    };
  }

  // Add sample properties for testing
  addSampleProperties(mockData) {
    const sampleProperties = [
      {
        id: 'prop_001',
        title: 'Modern 2-Bedroom Apartment in Molyko',
        description: 'Beautiful apartment with mountain views, fully furnished',
        location: 'Molyko, Buea',
        propertyType: 'apartment',
        price: 75000,
        bedrooms: 2,
        bathrooms: 1,
        amenities: ['wifi', 'parking', 'generator', 'security'],
        agentName: 'John Doe',
        agentPhone: '+237671234567',
        status: 'available',
        images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'prop_002',
        title: 'Cozy Studio in Great Soppo',
        description: 'Perfect for students, close to university',
        location: 'Great Soppo, Buea',
        propertyType: 'studio',
        price: 35000,
        bedrooms: 0,
        bathrooms: 1,
        amenities: ['wifi', 'water', 'security'],
        agentName: 'Jane Smith',
        agentPhone: '+237677654321',
        status: 'available',
        images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'prop_003',
        title: 'Spacious 3-Bedroom House',
        description: 'Family house with garden and parking',
        location: 'Bonduma, Buea',
        propertyType: 'house',
        price: 120000,
        bedrooms: 3,
        bathrooms: 2,
        amenities: ['parking', 'garden', 'generator', 'security', 'water'],
        agentName: 'Mike Johnson',
        agentPhone: '+237681234567',
        status: 'available',
        images: ['https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop'],
        createdAt: new Date().toISOString()
      }
    ];

    // Add properties to mock database
    sampleProperties.forEach(property => {
      const key = `properties/${property.id}`;
      mockData.set(key, property);
    });

    logger.info(`Added ${sampleProperties.length} sample properties to mock database`);
  }

  // Generic CRUD operations
  async create(collection, data, id = null) {
    try {
      const collectionRef = this.db.collection(collection);
      
      if (id) {
        await collectionRef.doc(id).set(data);
        logger.info(`Created document in ${collection} with ID: ${id}`);
        return { id, ...data };
      } else {
        const docRef = await collectionRef.add(data);
        logger.info(`Created document in ${collection} with ID: ${docRef.id}`);
        return { id: docRef.id, ...data };
      }
    } catch (error) {
      logger.error(`Error creating document in ${collection}:`, {
        message: error.message,
        code: error.code,
        details: error.details,
        collection: collection,
        dataKeys: Object.keys(data)
      });
      throw error;
    }
  }

  async getById(collection, id) {
    try {
      const doc = await this.db.collection(collection).doc(id).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      logger.error(`Error getting document ${id} from ${collection}:`, error);
      throw error;
    }
  }

  async update(collection, id, data) {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date()
      };
      
      await this.db.collection(collection).doc(id).update(updateData);
      logger.info(`Updated document ${id} in ${collection}`);
      
      return await this.getById(collection, id);
    } catch (error) {
      logger.error(`Error updating document ${id} in ${collection}:`, error);
      throw error;
    }
  }

  async delete(collection, id) {
    try {
      await this.db.collection(collection).doc(id).delete();
      logger.info(`Deleted document ${id} from ${collection}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting document ${id} from ${collection}:`, error);
      throw error;
    }
  }

  async getAll(collection, filters = {}, orderBy = null, limit = null) {
    try {
      let query = this.db.collection(collection);

      // Apply filters
      Object.entries(filters).forEach(([field, value]) => {
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            query = query.where(field, 'in', value);
          } else if (typeof value === 'object' && value.operator) {
            query = query.where(field, value.operator, value.value);
          } else {
            query = query.where(field, '==', value);
          }
        }
      });

      // Apply ordering
      if (orderBy) {
        if (typeof orderBy === 'string') {
          query = query.orderBy(orderBy);
        } else {
          query = query.orderBy(orderBy.field, orderBy.direction || 'asc');
        }
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      const snapshot = await query.get();
      const documents = [];
      
      snapshot.forEach(doc => {
        documents.push({ id: doc.id, ...doc.data() });
      });

      return documents;
    } catch (error) {
      logger.error(`Error getting documents from ${collection}:`, error);
      throw error;
    }
  }

  async search(collection, searchField, searchTerm, additionalFilters = {}) {
    try {
      let query = this.db.collection(collection);

      // Apply additional filters first
      Object.entries(additionalFilters).forEach(([field, value]) => {
        if (value !== null && value !== undefined) {
          query = query.where(field, '==', value);
        }
      });

      // For text search, we'll use a simple approach with array-contains for keywords
      // In production, you might want to use Algolia or similar for full-text search
      if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase();
        query = query.where(`${searchField}_keywords`, 'array-contains', searchTermLower);
      }

      const snapshot = await query.get();
      const documents = [];
      
      snapshot.forEach(doc => {
        documents.push({ id: doc.id, ...doc.data() });
      });

      return documents;
    } catch (error) {
      logger.error(`Error searching in ${collection}:`, error);
      throw error;
    }
  }

  async count(collection, filters = {}) {
    try {
      let query = this.db.collection(collection);

      // Apply filters
      Object.entries(filters).forEach(([field, value]) => {
        if (value !== null && value !== undefined) {
          query = query.where(field, '==', value);
        }
      });

      const snapshot = await query.get();
      return snapshot.size;
    } catch (error) {
      logger.error(`Error counting documents in ${collection}:`, error);
      throw error;
    }
  }

  async exists(collection, id) {
    try {
      const doc = await this.db.collection(collection).doc(id).get();
      return doc.exists;
    } catch (error) {
      logger.error(`Error checking if document ${id} exists in ${collection}:`, error);
      throw error;
    }
  }

  // Batch operations
  async batchCreate(collection, documents) {
    try {
      const batch = this.db.batch();
      const results = [];

      documents.forEach(data => {
        const docRef = this.db.collection(collection).doc();
        batch.set(docRef, data);
        results.push({ id: docRef.id, ...data });
      });

      await batch.commit();
      logger.info(`Batch created ${documents.length} documents in ${collection}`);
      return results;
    } catch (error) {
      logger.error(`Error batch creating documents in ${collection}:`, error);
      throw error;
    }
  }

  async batchUpdate(collection, updates) {
    try {
      const batch = this.db.batch();

      updates.forEach(({ id, data }) => {
        const docRef = this.db.collection(collection).doc(id);
        batch.update(docRef, { ...data, updatedAt: new Date() });
      });

      await batch.commit();
      logger.info(`Batch updated ${updates.length} documents in ${collection}`);
      return true;
    } catch (error) {
      logger.error(`Error batch updating documents in ${collection}:`, error);
      throw error;
    }
  }

  async batchDelete(collection, ids) {
    try {
      const batch = this.db.batch();

      ids.forEach(id => {
        const docRef = this.db.collection(collection).doc(id);
        batch.delete(docRef);
      });

      await batch.commit();
      logger.info(`Batch deleted ${ids.length} documents from ${collection}`);
      return true;
    } catch (error) {
      logger.error(`Error batch deleting documents from ${collection}:`, error);
      throw error;
    }
  }

  // Transaction support
  async runTransaction(callback) {
    try {
      return await this.db.runTransaction(callback);
    } catch (error) {
      logger.error('Error running transaction:', error);
      throw error;
    }
  }

  // Real-time listeners
  onSnapshot(collection, filters = {}, callback) {
    try {
      let query = this.db.collection(collection);

      // Apply filters
      Object.entries(filters).forEach(([field, value]) => {
        if (value !== null && value !== undefined) {
          query = query.where(field, '==', value);
        }
      });

      return query.onSnapshot(snapshot => {
        const documents = [];
        snapshot.forEach(doc => {
          documents.push({ id: doc.id, ...doc.data() });
        });
        callback(documents);
      });
    } catch (error) {
      logger.error(`Error setting up snapshot listener for ${collection}:`, error);
      throw error;
    }
  }

  // Utility methods
  generateId() {
    return this.db.collection('temp').doc().id;
  }

  getTimestamp() {
    return new Date();
  }

  getServerTimestamp() {
    return this.db.FieldValue.serverTimestamp();
  }
}

module.exports = DatabaseService;
