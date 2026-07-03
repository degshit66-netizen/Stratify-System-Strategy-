import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Tenant, User } from '../types';

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
  return key.startsWith('mock_') || 
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
    await setDoc(doc(db, 'tenants', tenant.id), tenant);
  } catch (e) {
    console.error('Error syncing tenant:', e);
  }
};

export const syncUserToFirebase = async (user: User) => {
  try {
    await setDoc(doc(db, 'users', user.id), user);
  } catch (e) {
    console.error('Error syncing user:', e);
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

