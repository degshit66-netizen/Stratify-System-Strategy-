import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Tenant, User, PasswordResetRequest } from '../types';

// Let's store references to the raw, original localStorage methods to prevent recursion
export const rawStorage = {
  getItem: Storage.prototype.getItem,
  setItem: Storage.prototype.setItem,
  removeItem: Storage.prototype.removeItem,
  clear: Storage.prototype.clear,
};

// Define global vs tenant-specific keys
const isGlobalKey = (key: string) => {
  if (!key) return true;
  return key.startsWith('stratify_') || 
         key.startsWith('onboarded_') || 
         key.startsWith('show_onboarding_') ||
         key.startsWith('stratify_theme') || 
         key.startsWith('firebase:') ||
         key.startsWith('firebase-') ||
         key.startsWith('__sak') ||
         key.startsWith('google-') ||
         key.includes('/') ||
         key.includes('firestore') ||
         key === 'current_tenant_id' || 
         key === 'current_user_id';
};

const getTenantKey = (key: string) => {
  if (isGlobalKey(key)) return key;
  try {
    const tenantId = rawStorage.getItem.call(window.localStorage, 'current_tenant_id');
    if (tenantId) {
      return `${tenantId}_${key}`;
    }
  } catch (e) {}
  return key;
};

// Apply the localStorage override
export const initializeLocalStorageOverride = () => {
  try {
    Storage.prototype.getItem = function(key: string) {
      if (!key) return null;
      return rawStorage.getItem.call(this, getTenantKey(key));
    };

    Storage.prototype.setItem = function(key: string, value: string) {
      if (!key) return;
      const tenantKey = getTenantKey(key);
      rawStorage.setItem.call(this, tenantKey, value);

      // Async sync to Firebase if it's tenant-specific
      if (!isGlobalKey(key)) {
        const tenantId = rawStorage.getItem.call(window.localStorage, 'current_tenant_id');
        if (tenantId) {
          syncStorageToFirebase(tenantId, key, value);
        }
      }
    };

    Storage.prototype.removeItem = function(key: string) {
      if (!key) return;
      const tenantKey = getTenantKey(key);
      rawStorage.removeItem.call(this, tenantKey);

      // Async delete from Firebase if it's tenant-specific
      if (!isGlobalKey(key)) {
        const tenantId = rawStorage.getItem.call(window.localStorage, 'current_tenant_id');
        if (tenantId) {
          deleteStorageFromFirebase(tenantId, key);
        }
      }
    };

    Storage.prototype.clear = function() {
      try {
        const tenantId = rawStorage.getItem.call(window.localStorage, 'current_tenant_id');
        if (!tenantId) {
          return;
        }
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(`${tenantId}_`)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => {
          rawStorage.removeItem.call(window.localStorage, k);
          const originalKey = k.replace(`${tenantId}_`, '');
          deleteStorageFromFirebase(tenantId, originalKey);
        });
      } catch (e) {}
    };
    // console.log("Successfully initialized secure tenant localStorage override with real-time Firestore sync.");
  } catch (e) {
    console.error("Failed to override localStorage", e);
  }
};

// Helper to save a single key-value to Firestore
export const syncStorageToFirebase = async (tenantId: string, key: string, value: string) => {
  try {
    if (!key || key.includes('/') || key.includes('firestore')) {
      return;
    }
    const docRef = doc(db, 'tenants', tenantId, 'storage', key);
    await setDoc(docRef, { value, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error(`Error syncing key ${key} for tenant ${tenantId}:`, e);
  }
};

// Helper to delete a single key-value from Firestore
export const deleteStorageFromFirebase = async (tenantId: string, key: string) => {
  try {
    if (!key || key.includes('/') || key.includes('firestore')) {
      return;
    }
    const docRef = doc(db, 'tenants', tenantId, 'storage', key);
    await deleteDoc(docRef);
  } catch (e) {
    console.error(`Error deleting key ${key} for tenant ${tenantId}:`, e);
  }
};

// Helper to load ALL storage keys from Firestore for a tenant and populate localStorage
export const loadStorageFromFirebase = async (tenantId: string) => {
  try {
    const colRef = collection(db, 'tenants', tenantId, 'storage');
    const snapshot = await getDocs(colRef);
    snapshot.forEach(doc => {
      const key = doc.id;
      const data = doc.data();
      if (data && typeof data.value === 'string') {
        const tenantKey = `${tenantId}_${key}`;
        rawStorage.setItem.call(window.localStorage, tenantKey, data.value);
      }
    });
    // console.log(`Successfully loaded and hydrated all Firestore storage for tenant ${tenantId}`);
  } catch (e) {
    console.error(`Error loading storage for tenant ${tenantId}:`, e);
  }
};

export const syncTenantToFirebase = async (tenant: Tenant) => {
  try {
    
    const cleanTenant = Object.fromEntries(Object.entries(tenant).filter(([_, v]) => v !== undefined));
    await setDoc(doc(db, 'tenants', tenant.id), cleanTenant);
  } catch (e) {
    console.error('Error syncing tenant:', e);
  }
};

export const syncUserToFirebase = async (user: User) => {
  try {
    
    const cleanUser = Object.fromEntries(Object.entries(user).filter(([_, v]) => v !== undefined));
    await setDoc(doc(db, 'users', user.id), cleanUser);
  } catch (e) {
    console.error('Error syncing user:', e);
  }
};


export const deleteUserFromFirebase = async (userId: string) => {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (e) {
    console.error('Error deleting user:', e);
  }
};

export const loadTenantsFromFirebase = async (): Promise<Tenant[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'tenants'));
    return querySnapshot.docs.map(doc => doc.data() as Tenant);
  } catch (e) {
    console.error('Error loading tenants:', e);
    return [];
  }
};

export const loadUsersFromFirebase = async (): Promise<User[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map(doc => doc.data() as User);
  } catch (e) {
    console.error('Error loading users:', e);
    return [];
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const users = await loadUsersFromFirebase();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  } catch (e) {
    return null;
  }
};

export const syncConfigToFirebase = async (key: string, value: string) => {
  try {
    await setDoc(doc(db, 'configurations', key), { 
      key, 
      value, 
      updatedAt: new Date().toISOString() 
    });
  } catch (e) {
    console.error(`Error syncing config ${key}:`, e);
  }
};

export const loadConfigFromFirebase = async (key: string): Promise<string | null> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'configurations'));
    const doc = querySnapshot.docs.find(d => d.id === key);
    return doc ? doc.data().value : null;
  } catch (e) {
    console.error(`Error loading config ${key}:`, e);
    return null;
  }
};



export const syncSubscriptionRequestToFirebase = async (req: any) => {
  try {
    const docRef = doc(db, 'subscription_requests', req.id);
    await setDoc(docRef, req);
  } catch (error) {
    console.error('Error saving subscription request:', error);
  }
};

export const deleteSubscriptionRequestFromFirebase = async (id: string) => {
  try {
    const docRef = doc(db, 'subscription_requests', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting subscription request:', error);
  }
};

export const loadSubscriptionRequestsFromFirebase = async (): Promise<any[]> => {
  try {
    const colRef = collection(db, 'subscription_requests');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => doc.data() as any);
  } catch (error) {
    console.error('Error loading subscription requests:', error);
    return [];
  }
};

export const syncPasswordResetRequestToFirebase = async (req: PasswordResetRequest) => {
  try {
    const docRef = doc(db, 'password_reset_requests', req.id);
    await setDoc(docRef, req);
  } catch (error) {
    console.error('Error saving password reset request:', error);
  }
};

export const deletePasswordResetRequestFromFirebase = async (id: string) => {
  try {
    const docRef = doc(db, 'password_reset_requests', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting password reset request:', error);
  }
};

export const loadPasswordResetRequestsFromFirebase = async (): Promise<PasswordResetRequest[]> => {
  try {
    const colRef = collection(db, 'password_reset_requests');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => doc.data() as PasswordResetRequest);
  } catch (error) {
    console.error('Error loading password reset requests:', error);
    return [];
  }
};
