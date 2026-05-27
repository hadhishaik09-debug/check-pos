import { initializeApp } from "firebase/app";

import {
    getFirestore,
} from "firebase/firestore";

import {
    getStorage,
} from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAVQQPRYrppeDMojOxLY5Q02IVy1VCx45M",

    authDomain: "pos-app-b3a69.firebaseapp.com",

    projectId: "pos-app-b3a69",

    storageBucket: "pos-app-b3a69.firebasestorage.app",

    messagingSenderId: "715353454879",

    appId: "1:715353454879:web:36feee56b1ec7e1a48582a",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const storage = getStorage(app);

export default app;