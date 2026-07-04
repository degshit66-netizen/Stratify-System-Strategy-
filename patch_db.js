import fs from 'fs';

const path = 'src/lib/db.ts';
let code = fs.readFileSync(path, 'utf8');

code += `

export const syncSubscriptionRequestToFirebase = async (req: any) => {
  try {
    const docRef = doc(db, 'subscription_requests', req.id);
    await setDoc(docRef, req);
  } catch (error) {
    console.error('Error saving subscription request:', error);
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
`;

fs.writeFileSync(path, code);
