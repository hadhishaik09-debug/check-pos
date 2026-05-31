import { useEffect, useRef } from 'react';
import { collection, onSnapshot, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Desktop-only: listen for new orders and send to Electron printer
export function useAutoPrint() {
  const handled = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).electronAPI) return;

    const ordersCol = collection(db, 'orders');
    const unsub = onSnapshot(ordersCol, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === 'added') {
          const data = change.doc.data() as any;
          const id = change.doc.id;
          if (handled.current[id]) continue;
          // Skip if already marked printed
          if (data?.printedByDesktop) {
            handled.current[id] = true;
            continue;
          }

          try {
            // Call electron to print
            const result = await (window as any).electronAPI.printOrder({ ...data, id });
            if (result?.success) {
              // Mark document as printedByDesktop
              await updateDoc(doc(db, 'orders', id), { printedByDesktop: true, printedAt: serverTimestamp() });
              handled.current[id] = true;
            }
          } catch (e) {
            console.error('Auto-print failed for', id, e);
          }
        }
      }
    });

    return () => {
      unsub();
    };
  }, []);
}
