const admin = require('firebase-admin');
const { logger } = require('../utils/logger');

let db = null;

const initializeFirebase = () => {
  try {
    if (admin.apps.length === 0) {
      // Skip Firebase initialization if no config is provided (test or development without Firebase)
      if (!process.env.FIREBASE_PROJECT_ID) {
        const env = process.env.NODE_ENV || 'development';
        logger.info(`⚠️ Skipping Firebase initialization in ${env} environment - no Firebase credentials provided`);
        logger.info('💡 To use Firebase, copy .env.example to .env and add your Firebase credentials');
        return;
      }

      // Check if we have a complete Firebase service account JSON
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        try {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
          });

          db = admin.firestore();
          db.settings({ timestampsInSnapshots: true });

          logger.info('✅ Firebase initialized successfully with service account JSON');
          return;
        } catch (error) {
          logger.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', error.message);
        }
      }

      // Validate required environment variables
      const requiredVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL'];
      const missingVars = requiredVars.filter(varName => !process.env[varName]);

      if (missingVars.length > 0) {
        logger.warn(`⚠️ Missing Firebase environment variables: ${missingVars.join(', ')}`);
        logger.info('💡 Firebase features will be disabled. Add missing variables to enable Firebase.');
        return;
      }

      const serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      });

      db = admin.firestore();

      // Configure Firestore settings
      db.settings({
        timestampsInSnapshots: true
      });

      logger.info('✅ Firebase initialized successfully');
    }
  } catch (error) {
    logger.error('❌ Firebase initialization failed:', error);
    if (process.env.NODE_ENV !== 'test') {
      throw error;
    }
  }
};

const getFirestore = () => {
  if (!db) {
    if (process.env.NODE_ENV === 'test') {
      // Return a mock Firestore instance for testing
      return {
        collection: () => ({
          doc: () => ({
            get: () => Promise.resolve({ exists: false }),
            set: () => Promise.resolve(),
            update: () => Promise.resolve(),
            delete: () => Promise.resolve()
          }),
          get: () => Promise.resolve({ docs: [] }),
          add: () => Promise.resolve({ id: 'mock-id' })
        })
      };
    }
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return db;
};

const getAuth = () => {
  return admin.auth();
};

// Collection references
const collections = {
  USERS: 'users',
  PROPERTIES: 'properties',
  AGENTS: 'agents',
  BOOKINGS: 'bookings',
  CONVERSATIONS: 'conversations',
  NOTIFICATIONS: 'notifications'
};

module.exports = {
  initializeFirebase,
  getFirestore,
  getAuth,
  collections,
  admin
};
