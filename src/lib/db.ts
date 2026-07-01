import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Tenant, User, LedgerEntry } from '../types';

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
