const { getFirestore, collections } = require('../config/firebase');
const { logger } = require('../utils/logger');

class DatabaseService {
  constructor() {
    this.db = getFirestore();
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
