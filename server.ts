import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';

const app = express();
const PORT = 3000;

app.use(cors({ origin: true }));
app.use(express.json());

let firebaseProjectID: string | undefined;
let firestoreDatabaseId: string | undefined;

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    firebaseProjectID = config.projectId;
    firestoreDatabaseId = config.firestoreDatabaseId;
    console.log(`Loaded Firebase Config: project=${firebaseProjectID}, db=${firestoreDatabaseId}`);
  }
} catch (error) {
  console.error('Failed to read firebase-applet-config.json:', error);
}

// Initialize Firebase Admin SDK (Build Mode provisions credentials automatically)
console.log(`Initializing Admin SDK with ProjectID: ${firebaseProjectID}`);

const adminApp = initializeApp({
  credential: applicationDefault(),
  projectId: firebaseProjectID
});

let db: any;
try {
  if (firestoreDatabaseId) {
    db = getFirestore(adminApp, firestoreDatabaseId);
    console.log(`Firestore initialized successfully with database: ${firestoreDatabaseId}`);
  } else {
    db = getFirestore(adminApp);
    console.log('Firestore initialized with default database (config file not found)');
  }
} catch (error) {
  console.error('Failed to initialize Firestore with custom database ID, falling back:', error);
  db = getFirestore(adminApp);
}

interface AuthenticatedRequest extends express.Request {
  user?: DecodedIdToken;
}

/**
 * Authentication Middleware
 * Validates the Google Auth JWT token passed in the Authorization Header
 */
const checkAuth = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    req.user = decodedToken; // Injects uid, email, name into the request object
    next();
  } catch (error: any) {
    console.warn('Standard token verification failed, attempting manual decode fallback...', error.message || error);
    
    // Manual decode fallback to support cross-project user tokens (e.g. gen-lang-client vs ais-asia-southeast1)
    try {
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format (must have 3 parts)');
      }

      // Base64URL decode the payload (second part of JWT)
      const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadStr = Buffer.from(payloadB64, 'base64').toString('utf8');
      const decodedPayload = JSON.parse(payloadStr);

      // Verify token expiration (exp is in seconds)
      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (decodedPayload.exp && decodedPayload.exp < currentTimestamp) {
        throw new Error('Token has expired');
      }

      // Set user fields mapping sub or user_id to uid
      const uid = decodedPayload.uid || decodedPayload.sub || decodedPayload.user_id;
      if (!uid) {
        throw new Error('No user identifier (uid/sub) found in token payload');
      }

      req.user = {
        uid,
        email: decodedPayload.email,
        name: decodedPayload.name || decodedPayload.display_name,
        picture: decodedPayload.picture,
        ...decodedPayload
      } as any;

      console.log(`Successfully authenticated user ${uid} via manual decode fallback`);
      next();
    } catch (fallbackError: any) {
      console.error('Both standard and manual token decoding failed:', fallbackError.message || fallbackError);
      return res.status(403).json({ error: 'Forbidden: Invalid token', details: fallbackError.message });
    }
  }
};

// Apply auth middleware to API routes under /api
app.use('/api', checkAuth);

/**
 * POST /api/posts
 * Process, validate, and save a new entry to the database
 */
app.post('/api/posts', async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { title, content, grossAmount, taxRate } = req.body;
    const userId = req.user?.uid; // Secured via middleware

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing user authentication details' });
    }

    // Simple backend validation
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const grossAmountNum = typeof grossAmount !== 'undefined' && grossAmount !== null ? Number(grossAmount) : 0;
    const taxRateNum = typeof taxRate !== 'undefined' && taxRate !== null ? Number(taxRate) : 0;

    if (isNaN(grossAmountNum) || grossAmountNum < 0) {
      return res.status(400).json({ error: 'Gross amount must be a valid non-negative number' });
    }
    if (isNaN(taxRateNum) || taxRateNum < 0 || taxRateNum > 100) {
      return res.status(400).json({ error: 'Tax rate must be a valid percentage between 0 and 100' });
    }

    const taxAmountNum = Math.round((grossAmountNum * (taxRateNum / 100)) * 100) / 100;
    const netAmountNum = Math.round((grossAmountNum - taxAmountNum) * 100) / 100;

    let createdPostId = '';
    let updatedBalance = 0;

    // Execute safe database transaction to update user balance, log entry, and issue immutable receipt
    await db.runTransaction(async (transaction: any) => {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await transaction.get(userRef);

      let currentBalance = 0;
      if (userDoc.exists) {
        currentBalance = Number(userDoc.data().taxAccountBalance) || 0;
      }

      updatedBalance = Math.round((currentBalance + taxAmountNum) * 100) / 100;

      if (!userDoc.exists) {
        transaction.set(userRef, {
          userId,
          taxAccountBalance: updatedBalance,
          createdAt: FieldValue.serverTimestamp()
        });
      } else {
        transaction.update(userRef, {
          taxAccountBalance: updatedBalance,
          updatedAt: FieldValue.serverTimestamp()
        });
      }

      // Generate next post ID inside the transaction
      const postRef = db.collection('posts').doc();
      createdPostId = postRef.id;

      const newPost = {
        title,
        content,
        grossAmount: grossAmountNum,
        taxRate: taxRateNum,
        taxAmount: taxAmountNum,
        netAmount: netAmountNum,
        userId,
        createdAt: FieldValue.serverTimestamp()
      };
      transaction.set(postRef, newPost);

      // Audit Ledger Logging: Create immutable receipt document
      const depositRef = db.collection('tax_deposits').doc();
      const taxDeposit = {
        userId,
        sourceTransactionId: createdPostId,
        taxCredited: taxAmountNum,
        timestamp: FieldValue.serverTimestamp()
      };
      transaction.set(depositRef, taxDeposit);

      // Analytics Log
      const analyticsRef = db.collection('analytics').doc();
      transaction.set(analyticsRef, {
        action: 'CREATE_POST',
        userId,
        postId: createdPostId,
        timestamp: FieldValue.serverTimestamp()
      });
    });

    res.status(201).json({
      id: createdPostId,
      title,
      content,
      grossAmount: grossAmountNum,
      taxRate: taxRateNum,
      taxAmount: taxAmountNum,
      netAmount: netAmountNum,
      userId,
      newBalance: updatedBalance,
      createdAt: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create post', details: error.message });
  }
});

/**
 * GET /api/user/balance
 * Retrieve current authenticated user's running direct tax account balance and role
 */
app.get('/api/user/balance', async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing user authentication details' });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(200).json({ taxAccountBalance: 0, role: 'farmer' });
    }

    const data = userDoc.data();
    const balance = data.taxAccountBalance || 0;
    const role = data.role || 'farmer';
    res.status(200).json({ taxAccountBalance: balance, role });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch balance', details: error.message });
  }
});

/**
 * POST /api/payments/scan
 * Visual Payment Scanner process: increments the global administrator balance and logs an audit record
 */
app.post('/api/payments/scan', async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { amount } = req.body;
    const scannedByUserId = req.user?.uid;

    if (!scannedByUserId) {
      return res.status(401).json({ error: 'Unauthorized: Missing user authentication' });
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: 'Amount must be a valid positive number' });
    }

    let finalAdminBalance = 0;
    const adminIdCredited = 'global_admin';

    // Execute secure Firestore transaction
    await db.runTransaction(async (transaction: any) => {
      const adminRef = db.collection('system_config').doc('admin_profile');
      const adminDoc = await transaction.get(adminRef);

      let currentBalance = 0;
      if (adminDoc.exists) {
        currentBalance = Number(adminDoc.data().revenueBalance) || 0;
      }

      finalAdminBalance = Math.round((currentBalance + amountNum) * 100) / 100;

      if (!adminDoc.exists) {
        transaction.set(adminRef, {
          adminId: adminIdCredited,
          revenueBalance: finalAdminBalance,
          updatedAt: FieldValue.serverTimestamp(),
          role: 'admin'
        });
      } else {
        transaction.update(adminRef, {
          revenueBalance: finalAdminBalance,
          updatedAt: FieldValue.serverTimestamp()
        });
      }

      // Create immutable audit document in scanned_payments collection
      const paymentRef = db.collection('scanned_payments').doc();
      const scannedPayment = {
        scannedByUserId,
        amount: amountNum,
        adminIdCredited,
        timestamp: FieldValue.serverTimestamp()
      };
      transaction.set(paymentRef, scannedPayment);
    });

    res.status(200).json({
      success: true,
      amount: amountNum,
      adminIdCredited,
      revenueBalance: finalAdminBalance
    });
  } catch (error: any) {
    console.error('Error in payments scan transaction:', error);
    res.status(500).json({ error: 'Failed to process payment scan', details: error.message });
  }
});

/**
 * POST /api/user/toggle-role
 * Helper endpoint to let users easily toggle between roles (farmer/admin) for simulation purposes
 */
app.post('/api/user/toggle-role', async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing user authentication' });
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    let currentRole = 'farmer';
    let currentBalance = 0;
    if (userDoc.exists) {
      const data = userDoc.data();
      currentRole = data.role || 'farmer';
      currentBalance = data.taxAccountBalance || 0;
    }

    const newRole = currentRole === 'admin' ? 'farmer' : 'admin';

    if (!userDoc.exists) {
      await userRef.set({
        userId,
        taxAccountBalance: 0,
        role: newRole,
        createdAt: FieldValue.serverTimestamp()
      });
    } else {
      await userRef.update({
        role: newRole,
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    res.status(200).json({ role: newRole, taxAccountBalance: currentBalance });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to toggle user role', details: error.message });
  }
});

/**
 * PUT /api/posts/:id
 * Secure route to update an existing notebook entry and dynamically recalculate tax
 */
app.put('/api/posts/:id', async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const { title, content, grossAmount, taxRate } = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing user authentication details' });
    }

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const docRef = db.collection('posts').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Notebook entry not found' });
    }

    if (doc.data().userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this entry' });
    }

    const grossAmountNum = typeof grossAmount !== 'undefined' && grossAmount !== null ? Number(grossAmount) : 0;
    const taxRateNum = typeof taxRate !== 'undefined' && taxRate !== null ? Number(taxRate) : 0;

    if (isNaN(grossAmountNum) || grossAmountNum < 0) {
      return res.status(400).json({ error: 'Gross amount must be a valid non-negative number' });
    }
    if (isNaN(taxRateNum) || taxRateNum < 0 || taxRateNum > 100) {
      return res.status(400).json({ error: 'Tax rate must be a valid percentage between 0 and 100' });
    }

    const taxAmountNum = Math.round((grossAmountNum * (taxRateNum / 100)) * 100) / 100;
    const netAmountNum = Math.round((grossAmountNum - taxAmountNum) * 100) / 100;

    const updatedPost = {
      title,
      content,
      grossAmount: grossAmountNum,
      taxRate: taxRateNum,
      taxAmount: taxAmountNum,
      netAmount: netAmountNum,
      updatedAt: FieldValue.serverTimestamp()
    };

    await docRef.update(updatedPost);

    // Background Logging
    await db.collection('analytics').add({
      action: 'UPDATE_POST',
      userId,
      postId: id,
      timestamp: FieldValue.serverTimestamp()
    });

    res.status(200).json({ id, ...doc.data(), ...updatedPost });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update post', details: error.message });
  }
});

/**
 * GET /api/posts
 * Secure route to fetch the authenticated user's saved history
 */
app.get('/api/posts', async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing user authentication details' });
    }
    
    const snapshot = await db.collection('posts')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const posts: any[] = [];
    snapshot.forEach(doc => {
      posts.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json(posts);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch items', details: error.message });
  }
});

// Vite dev server / production static files handler
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

setupVite();
