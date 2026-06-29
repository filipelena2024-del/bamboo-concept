(function() {
    'use strict';
    window.BambooShop = window.BambooShop || {};

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
            // Load the git-ignored config file containing API keys
            try {
                await loadScript("js/config.js");
            } catch (err) {
                console.warn("js/config.js could not be loaded dynamically. Falling back to window.BambooShopConfig.", err);
            }

            const firebaseConfig = (window.BambooShopConfig && window.BambooShopConfig.firebase) || {
                apiKey: "",
                authDomain: "",
                projectId: "",
                storageBucket: "",
                messagingSenderId: "",
                appId: "",
                measurementId: ""
            };

            // Load app, auth, and firestore SDK compat/classic versions
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js");
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js");

            // Initialize compat SDK
            const firebaseApp = firebase.initializeApp(firebaseConfig);
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
                },
                decrementStock: async (productId, quantity) => {
                    const ref = db.collection("products").doc(productId);
                    // Use Firestore atomic increment to safely adjust stock
                    // quantity > 0 = reduce (order placed), quantity < 0 = restore (order cancelled/deleted)
                    await ref.update({
                        stock: firebase.firestore.FieldValue.increment(-quantity)
                    });
                    // Read back to update isAvailable based on real stock value
                    const snap = await ref.get();
                    if (snap.exists) {
                        const newStock = snap.data().stock;
                        if (typeof newStock !== 'undefined') {
                            if (newStock <= 0) {
                                // Clamp to 0 and mark unavailable
                                await ref.update({ stock: 0, isAvailable: false });
                            } else {
                                // Stock is positive — ensure isAvailable is true (handles restored orders)
                                await ref.update({ isAvailable: true });
                            }
                        }
                    }
                }
            };

            window.dispatchEvent(new Event('bamboo_firebase_ready'));

        } catch (err) {
            console.error("Failed to load Firebase scripts dynamically:", err);
        }
    }

    initFirebaseLegacy();
})();
