(function() {
    'use strict';
    window.BambooShop = window.BambooShop || {};

    const STORAGE_KEY = 'bamboo_cart';
    let cartItems = [];
    let listeners = [];

    const cartApi = {
        init: function() {
            this.load();
        },

        load: function() {
            cartItems = BambooShop.utils.safeLocalStorage.get(STORAGE_KEY) || [];
            this.notifyListeners();
        },

        save: function() {
            BambooShop.utils.safeLocalStorage.set(STORAGE_KEY, cartItems);
            this.notifyListeners();
        },

        getItems: function() {
            // Populate with full product details and apply variant modifications
            return cartItems.map(item => {
                const product = BambooShop.products.getById(item.productId);
                if (!product) return null; // Product was deleted from store
                
                let itemName = product.name;
                let itemImages = [...(product.images || [])];
                
                if (item.variantLabel && product.variants) {
                    const variant = product.variants.find(v => v.label === item.variantLabel);
                    if (variant) {
                        itemName = `${product.name} - ${variant.label}`;
                        if (variant.image) {
                            // Insert variant image at the beginning of the images list
                            itemImages = [variant.image, ...itemImages.filter(img => img !== variant.image)];
                        }
                    }
                }
                
                return {
                    ...product,
                    name: itemName,
                    images: itemImages,
                    quantity: item.quantity,
                    variantLabel: item.variantLabel || '',
                    cartItemId: `${item.productId}_${item.variantLabel || 'default'}`
                };
            }).filter(item => item !== null);
        },

        addItem: function(productId, quantity = 1, variantLabel = '') {
            // Check if product exists and is available
            const product = BambooShop.products.getById(productId);
            if (!product || !product.isAvailable) {
                this.showToast('product.out_of_stock', 'error');
                return false;
            }

            const existingItem = cartItems.find(item => item.productId === productId && (item.variantLabel || '') === variantLabel);
            if (existingItem) {
                // Limit max quantity to 99
                existingItem.quantity = Math.min(99, existingItem.quantity + quantity);
            } else {
                cartItems.push({ 
                    productId, 
                    quantity: Math.min(99, Math.max(1, quantity)),
                    variantLabel: variantLabel || ''
                });
            }

            this.save();
            this.showToast('product.added_to_cart', 'success');
            
            // Trigger badge animation
            const badge = document.getElementById('cart-count-badge');
            if (badge) {
                badge.classList.remove('nav__cart-count--pop');
                void badge.offsetWidth; // Trigger reflow
                badge.classList.add('nav__cart-count--pop');
            }

            return true;
        },

        removeItem: function(cartItemId) {
            cartItems = cartItems.filter(item => {
                const itemKey = `${item.productId}_${item.variantLabel || 'default'}`;
                return itemKey !== cartItemId;
            });
            this.save();
            this.showToast('cart.item_removed', 'info');
        },

        updateQuantity: function(cartItemId, quantity) {
            const qty = parseInt(quantity, 10);
            
            if (isNaN(qty) || qty <= 0) {
                this.removeItem(cartItemId);
                return;
            }

            const item = cartItems.find(item => {
                const itemKey = `${item.productId}_${item.variantLabel || 'default'}`;
                return itemKey === cartItemId;
            });
            if (item) {
                item.quantity = Math.min(99, qty);
                this.save();
            }
        },

        getCount: function() {
            return cartItems.reduce((total, item) => total + item.quantity, 0);
        },

        getSubtotal: function() {
            const items = this.getItems();
            return items.reduce((total, item) => {
                const price = item.isOnSale && item.salePrice ? item.salePrice : item.price;
                return total + (price * item.quantity);
            }, 0);
        },

        getDeliveryFee: function() {
            const subtotal = this.getSubtotal();
            if (subtotal === 0) return 0;
            // Free delivery over 3000 MKD
            return subtotal > 3000 ? 0 : 200; // Fixed 200 MKD delivery fee
        },

        getTotal: function() {
            return this.getSubtotal() + this.getDeliveryFee();
        },

        clear: function() {
            cartItems = [];
            this.save();
        },

        onCartChange: function(callback) {
            listeners.push(callback);
            // Initial call
            callback(this.getItems(), this.getCount());
        },

        notifyListeners: function() {
            const items = this.getItems();
            const count = this.getCount();
            
            // Update badge globally
            const badge = document.getElementById('cart-count-badge');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'flex' : 'none';
            }

            listeners.forEach(cb => {
                try { cb(items, count); } catch(e) { console.error('Cart listener error', e); }
            });
        },

        showToast: function(key, type = 'info') {
            if (BambooShop.ui && typeof BambooShop.ui.showToast === 'function') {
                const message = BambooShop.i18n ? BambooShop.i18n.t(key) : key;
                BambooShop.ui.showToast(message, type);
            }
        }
    };

    window.BambooShop.cart = cartApi;
})();
