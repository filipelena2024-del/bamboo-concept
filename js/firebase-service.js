(function() {
    'use strict';
    window.BambooShop = window.BambooShop || {};

    const config = {
        apiKey: "AIzaSyB54a0PckU7Sis3fB4y10EbOPMDh_louI8",
        authDomain: "bamboo-concept.firebaseapp.com",
        projectId: "bamboo-concept",
        storageBucket: "bamboo-concept.firebasestorage.app",
        messagingSenderId: "158461070278",
        appId: "1:158461070278:web:d52e95afc46b34b1e6c0c7",
        measurementId: "G-TTFF5GEKG1"
    };

    // Load Firebase Scripts dynamically from CDN using standard non-module script tag approach
    function loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async function initFirebaseLegacy() {
        try {
            // Load app, auth, and firestore SDK compat/classic versions
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js");
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js");

            // Initialize compat SDK
            const firebaseApp = firebase.initializeApp(config);
            const auth = firebase.auth();
            const db = firebase.firestore();

            // Expose standard wrappers
            window.BambooShop.firebase = {
                auth,
                db,
                login: (email, password) => auth.signInWithEmailAndPassword(email, password),
                logout: () => auth.signOut(),
                onAuth: (callback) => auth.onAuthStateChanged(callback),
                
                getProducts: async () => {
                    const snapshot = await db.collection("products").get();
                    const products = [];
                    snapshot.forEach(doc => {
                        products.push({ id: doc.id, ...doc.data() });
                    });
                    return products;
                },
                saveProduct: async (id, data) => {
                    await db.collection("products").doc(id).set(data, { merge: true });
                },
                deleteProduct: async (id) => {
                    await db.collection("products").doc(id).delete();
                },
                getOrders: async () => {
                    const snapshot = await db.collection("orders").get();
                    const orders = [];
                    snapshot.forEach(doc => {
                        orders.push({ id: doc.id, ...doc.data() });
                    });
                    return orders;
                },
                saveOrder: async (id, data) => {
                    await db.collection("orders").doc(id).set(data);
                },
                updateOrderStatus: async (id, status) => {
                    await db.collection("orders").doc(id).update({ status: status });
                }
            };

            window.dispatchEvent(new Event('bamboo_firebase_ready'));

        } catch (err) {
            console.error("Failed to load Firebase scripts dynamically:", err);
        }
    }

    initFirebaseLegacy();
})();
