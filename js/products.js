(function() {
    'use strict';
    window.BambooShop = window.BambooShop || {};

    const CATEGORIES = [
        { id: 'luxury_sets', nameKey: 'categories.luxury_sets' },
        { id: 'outdoor', nameKey: 'categories.outdoor' },
        { id: 'dining_tables', nameKey: 'categories.dining_tables' },
        { id: 'baby_bassinets', nameKey: 'categories.baby_bassinets' },
        { id: 'bamboo_products', nameKey: 'categories.bamboo_products' }
    ];

    const STORAGE_KEY = 'bamboo_products';
    let localProductsCache = [];
    let isInitialized = false;

    // Helper to initialize products from Firebase or LocalStorage fallback
    async function initializeProducts() {
        if (isInitialized) return;
        isInitialized = true;
        
        try {
            // First let's check if Firebase service is ready
            if (window.BambooShop.firebase && window.BambooShop.firebase.getProducts) {

                const products = await window.BambooShop.firebase.getProducts();
                if (products && products.length > 0) {
                    localProductsCache = products;
                    // Keep localStorage updated as fallback cache
                    BambooShop.utils.safeLocalStorage.set(STORAGE_KEY, products);

                    window.dispatchEvent(new Event('bamboo_products_loaded'));
                    return;
                }
            }
        } catch (err) {
            console.error("Error fetching from Firestore, falling back to local storage:", err);
        }

        // Fallback: load seed/local storage

        let stored = BambooShop.utils.safeLocalStorage.get(STORAGE_KEY);
        if (!stored || stored.length === 0) {
            stored = window.BAMBOO_PRODUCTS_DATA || [];
            BambooShop.utils.safeLocalStorage.set(STORAGE_KEY, stored);
        }
        localProductsCache = stored;
        window.dispatchEvent(new Event('bamboo_products_loaded'));
    }

    const productsApi = {
        CATEGORIES: CATEGORIES,

        getAll: function() {
            return localProductsCache.length > 0 ? localProductsCache : (BambooShop.utils.safeLocalStorage.get(STORAGE_KEY) || []);
        },

        getById: function(id) {
            const all = this.getAll();
            return all.find(p => p.id === id) || null;
        },

        getByCategory: function(categoryId) {
            const all = this.getAll();
            return all.filter(p => p.category === categoryId);
        },

        getBySlug: function(slug) {
            const all = this.getAll();
            return all.find(p => p.slug === slug) || null;
        },

        getFeatured: function() {
            const all = this.getAll();
            return all.filter(p => p.isFeatured && (typeof p.stock !== 'undefined' ? p.stock > 0 : p.isAvailable));
        },

        getOnSale: function() {
            const all = this.getAll();
            return all.filter(p => p.isOnSale && (typeof p.stock !== 'undefined' ? p.stock > 0 : p.isAvailable));
        },

        search: function(query) {
            if (!query) return this.getAll();
            
            // Transliteration helper for dual English/Cyrillic search
            const macedonianTranslitMap = {
                'a':'а', 'b':'б', 'v':'в', 'g':'г', 'd':'д', 'gj':'ѓ', 'e':'е', 'zh':'ж',
                'z':'з', 'dz':'ѕ', 'i':'и', 'j':'ј', 'k':'к', 'l':'л', 'lj':'љ', 'm':'м',
                'n':'н', 'nj':'њ', 'o':'о', 'p':'п', 'r':'р', 's':'с', 't':'т', 'kj':'ќ',
                'u':'у', 'f':'ф', 'h':'х', 'c':'ц', 'ch':'ч', 'dzh':'џ', 'sh':'ш',
                'c':'ц', 'x':'кс', 'y':'и', 'q':'ку', 'w':'в'
            };

            const transliterateToCyrillic = (text) => {
                let result = '';
                let i = 0;
                while (i < text.length) {
                    // Check 2-letter combos (gj, zh, dz, lj, nj, kj, ch, sh)
                    if (i + 1 < text.length) {
                        const doubleChar = text.substring(i, i + 2).toLowerCase();
                        if (macedonianTranslitMap[doubleChar]) {
                            result += macedonianTranslitMap[doubleChar];
                            i += 2;
                            continue;
                        }
                    }
                    const singleChar = text[i].toLowerCase();
                    result += macedonianTranslitMap[singleChar] || singleChar;
                    i++;
                }
                return result;
            };

            const lowerQuery = query.toLowerCase();
            const cyrillicQuery = transliterateToCyrillic(lowerQuery);
            const all = this.getAll();

            return all.filter(p => {
                const name = p.name ? p.name.toLowerCase() : '';
                const desc = p.description ? p.description.toLowerCase() : '';
                
                return name.includes(lowerQuery) || 
                       name.includes(cyrillicQuery) || 
                       desc.includes(lowerQuery) || 
                       desc.includes(cyrillicQuery);
            });
        },

        filter: function({ categories = [], priceMin = null, priceMax = null, inStockOnly = false }) {
            let filtered = this.getAll();

            if (categories.length > 0) {
                filtered = filtered.filter(p => categories.includes(p.category));
            }

            if (priceMin !== null) {
                filtered = filtered.filter(p => {
                    const price = p.isOnSale && p.salePrice ? p.salePrice : p.price;
                    return price >= priceMin;
                });
            }

            if (priceMax !== null) {
                filtered = filtered.filter(p => {
                    const price = p.isOnSale && p.salePrice ? p.salePrice : p.price;
                    return price <= priceMax;
                });
            }

            if (inStockOnly) {
                filtered = filtered.filter(p => (typeof p.stock !== 'undefined' ? p.stock > 0 : p.isAvailable));
            }

            return filtered;
        },

        sort: function(productsArray, sortBy) {
            const copy = [...productsArray];
            
            // Helper to get stock status
            const hasStock = (p) => {
                return (typeof p.stock !== 'undefined' ? p.stock > 0 : p.isAvailable);
            };

            // Main sort operation
            copy.sort((a, b) => {
                const stockA = hasStock(a) ? 1 : 0;
                const stockB = hasStock(b) ? 1 : 0;

                // If one is in stock and the other isn't, put in-stock first
                if (stockA !== stockB) {
                    return stockB - stockA; // 1 - 0 = positive (b goes first), 0 - 1 = negative (a goes first)
                }

                // If both are in stock or both out of stock, apply sorting key
                switch (sortBy) {
                    case 'price-asc':
                        const priceA_asc = a.isOnSale && a.salePrice ? a.salePrice : a.price;
                        const priceB_asc = b.isOnSale && b.salePrice ? b.salePrice : b.price;
                        return priceA_asc - priceB_asc;
                    case 'price-desc':
                        const priceA_desc = a.isOnSale && a.salePrice ? a.salePrice : a.price;
                        const priceB_desc = b.isOnSale && b.salePrice ? b.salePrice : b.price;
                        return priceB_desc - priceA_desc;
                    case 'name':
                        return a.name.localeCompare(b.name);
                    case 'newest':
                    default:
                        return (b.createdAt || 0) - (a.createdAt || 0);
                }
            });

            return copy;
        },

        save: async function(productData) {
            let id = productData.id;
            if (!id) {
                id = BambooShop.utils.generateId();
                productData.id = id;
                productData.slug = BambooShop.utils.slugify(productData.name);
                productData.rating = 0;
                productData.reviewCount = 0;
                productData.createdAt = Date.now();
            }

            // Clean properties
            productData.isAvailable = productData.stock > 0;

            // Save to Firestore first
            if (window.BambooShop.firebase && window.BambooShop.firebase.saveProduct) {
                try {
                    await window.BambooShop.firebase.saveProduct(id, productData);

                } catch (err) {
                    console.error("Firestore save failed, saving locally:", err);
                }
            }

            // Sync with local memory cache
            const all = this.getAll();
            const index = all.findIndex(p => p.id === id);
            if (index !== -1) {
                all[index] = { ...all[index], ...productData };
            } else {
                all.push(productData);
            }
            localProductsCache = all;
            BambooShop.utils.safeLocalStorage.set(STORAGE_KEY, all);
            return productData;
        },

        remove: async function(id) {
            // Remove from Firestore
            if (window.BambooShop.firebase && window.BambooShop.firebase.deleteProduct) {
                try {
                    await window.BambooShop.firebase.deleteProduct(id);

                } catch (err) {
                    console.error("Firestore delete failed:", err);
                }
            }

            // Sync with local memory cache
            const all = this.getAll();
            const filtered = all.filter(p => p.id !== id);
            localProductsCache = filtered;
            return BambooShop.utils.safeLocalStorage.set(STORAGE_KEY, filtered);
        },

        getCount: function() {
            return this.getAll().length;
        },

        init: function() {
            // Wait for Firebase service wrapper to load, or initialize immediately if loaded
            if (window.BambooShop.firebase) {
                initializeProducts();
            } else {
                window.addEventListener('bamboo_firebase_ready', initializeProducts);
                // Fallback check in case script isn't module-ready or timed out
                setTimeout(() => {
                    initializeProducts();
                }, 2000);
            }
        }
    };

    window.BambooShop.products = productsApi;
})();
