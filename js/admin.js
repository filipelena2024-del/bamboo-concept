(function() {
    'use strict';
    window.BambooShop = window.BambooShop || {};

    const admin = {
        init: function() {
            this.loginScreen = document.getElementById('admin-login-screen');
            this.dashboardScreen = document.getElementById('admin-dashboard-screen');
            
            this.setupFirebaseListen();
            this.setupNav();

            // Make it available globally for inline onclicks in admin
            window.adminController = this;
        },

        setupFirebaseListen: function() {
            // Wait for Firebase to check the user authentication state in real time
            if (window.BambooShop.firebase && window.BambooShop.firebase.onAuth) {
                window.BambooShop.firebase.onAuth((user) => {
                    if (user) {
                        sessionStorage.setItem('bamboo_admin_auth', 'true');
                        this.showDashboard();
                    } else {
                        sessionStorage.removeItem('bamboo_admin_auth');
                        this.showLogin();
                    }
                });
            } else {
                // Fallback check
                window.addEventListener('bamboo_firebase_ready', () => {
                    window.BambooShop.firebase.onAuth((user) => {
                        if (user) {
                            sessionStorage.setItem('bamboo_admin_auth', 'true');
                            this.showDashboard();
                        } else {
                            sessionStorage.removeItem('bamboo_admin_auth');
                            this.showLogin();
                        }
                    });
                });
            }
        },

        showLogin: function() {
            this.loginScreen.style.display = 'flex';
            this.dashboardScreen.style.display = 'none';

            const form = document.getElementById('admin-login-form');
            if (form) {
                form.onsubmit = async (e) => {
                    e.preventDefault();
                    const email = document.getElementById('admin-email').value;
                    const pw = document.getElementById('admin-password').value;
                    
                    const submitBtn = form.querySelector('button[type="submit"]');
                    const originalBtnText = submitBtn.textContent;
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Verifying...';

                    try {
                        if (window.BambooShop.firebase && window.BambooShop.firebase.login) {
                            await window.BambooShop.firebase.login(email, pw);
                            // Auth listener will handle showing dashboard
                        } else {
                            throw new Error("Firebase Service wrapper is not initialized.");
                        }
                    } catch (err) {
                        console.error("Login error: ", err);
                        const errEl = document.getElementById('admin-login-error');
                        errEl.textContent = "Error: Invalid Email or Password.";
                        errEl.style.display = 'block';
                        setTimeout(() => errEl.style.display = 'none', 3000);
                    } finally {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalBtnText;
                    }
                };
            }
        },

        logout: async function() {
            if (window.BambooShop.firebase && window.BambooShop.firebase.logout) {
                try {
                    await window.BambooShop.firebase.logout();
                } catch(e) {
                    console.error("Logout error", e);
                }
            }
            sessionStorage.removeItem('bamboo_admin_auth');
            this.showLogin();
        },

        showDashboard: function() {
            this.loginScreen.style.display = 'none';
            this.dashboardScreen.style.display = 'flex'; // Uses flex from .admin-layout
            
            // Initialize data
            this.switchTab('dashboard');
        },

        setupNav: function() {
            const navBtns = document.querySelectorAll('.admin-nav__btn');
            navBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const tabId = btn.getAttribute('data-tab');
                    if (tabId === 'logout') {
                        this.logout();
                        return;
                    }
                    this.switchTab(tabId);
                    
                    // Update active state
                    navBtns.forEach(b => b.classList.remove('admin-nav__btn--active'));
                    btn.classList.add('admin-nav__btn--active');
                });
            });
        },

        switchTab: function(tabId) {
            // Hide all tabs
            document.querySelectorAll('.admin-tab-content').forEach(t => t.style.display = 'none');
            
            // Show target
            const target = document.getElementById(`tab-${tabId}`);
            if (target) target.style.display = 'block';

            // Render data
            if (tabId === 'dashboard') this.renderDashboard();
            else if (tabId === 'products') this.renderProducts();
            else if (tabId === 'orders') this.renderOrders();
        },

        renderDashboard: function() {
            const products = BambooShop.products.getAll();
            const orders = BambooShop.utils.safeLocalStorage.get('bamboo_orders') || [];

            document.getElementById('stat-products').textContent = products.length;
            document.getElementById('stat-orders').textContent = orders.length;
            
            const pending = orders.filter(o => o.status === 'new' || o.status === 'processing').length;
            document.getElementById('stat-pending').textContent = pending;

            const revenue = orders
                .filter(o => o.status !== 'cancelled')
                .reduce((sum, o) => sum + (o.totalMKD || 0), 0);
            
            // Use MKD explicitly for admin revenue
            document.getElementById('stat-revenue').textContent = BambooShop.utils.formatPrice(revenue, 'MKD');
        },

        renderProducts: function() {
            const products = BambooShop.products.getAll();
            const tbody = document.getElementById('admin-products-tbody');
            if (!tbody) return;

            if (products.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:var(--space-8)" data-i18n="admin.no_products">No products found</td></tr>`;
                BambooShop.i18n.applyTranslations();
                return;
            }

            let html = '';
            products.forEach(p => {
                const catObj = BambooShop.products.CATEGORIES.find(c => c.id === p.category);
                const catName = catObj ? BambooShop.i18n.t(catObj.nameKey) : p.category;

                html += `
                    <tr>
                        <td>
                            <div class="flex flex--center" style="justify-content:flex-start;gap:var(--space-3)">
                                <div style="width:40px;height:40px;border-radius:4px;background:#eee;overflow:hidden">
                                    ${p.images && p.images[0] ? `<img src="${p.images[0]}" style="width:100%;height:100%;object-fit:cover">` : ''}
                                </div>
                                <span style="font-weight:600">${BambooShop.utils.sanitizeHTML(p.name)}</span>
                            </div>
                        </td>
                        <td>${catName}</td>
                        <td>${BambooShop.utils.formatPrice(p.price, 'MKD')}</td>
                        <td>
                            <span style="font-weight:bold; color:${p.stock > 0 ? 'var(--moss)' : 'var(--error)'}">
                                ${p.stock}
                            </span>
                        </td>
                        <td>
                            <div class="flex gap-2">
                                <button class="btn btn--icon" onclick="adminController.openProductForm('${p.id}')">✏️</button>
                                <button class="btn btn--icon" style="color:var(--error)" onclick="adminController.deleteProduct('${p.id}')">🗑️</button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        },

        openProductForm: function(id = null) {
            const modal = document.getElementById('admin-product-modal');
            const form = document.getElementById('admin-product-form');
            
            // Render categories dropdown
            const catSelect = document.getElementById('prod-category');
            if (catSelect.options.length <= 1) { // Populate once
                let catHtml = '<option value="" disabled selected>Select Category</option>';
                BambooShop.products.CATEGORIES.forEach(c => {
                    catHtml += `<option value="${c.id}">${BambooShop.i18n.t(c.nameKey)}</option>`;
                });
                catSelect.innerHTML = catHtml;
            }

            form.reset();
            document.getElementById('prod-id').value = '';

            if (id) {
                const p = BambooShop.products.getById(id);
                if (p) {
                    document.getElementById('prod-id').value = p.id;
                    document.getElementById('prod-name').value = p.name;
                    document.getElementById('prod-category').value = p.category;
                    document.getElementById('prod-price').value = p.price;
                    document.getElementById('prod-sale-price').value = p.salePrice || '';
                    document.getElementById('prod-desc').value = p.description || '';
                    document.getElementById('prod-images').value = (p.images || []).join(',\n');
                    
                    document.getElementById('prod-stock').value = typeof p.stock !== 'undefined' ? p.stock : 10;
                    document.getElementById('prod-featured').checked = !!p.isFeatured;
                    document.getElementById('prod-sale').checked = !!p.isOnSale;

                    if (p.dimensions) {
                        document.getElementById('prod-dim-w').value = p.dimensions.width || '';
                        document.getElementById('prod-dim-h').value = p.dimensions.height || '';
                    }
                }
            } else {
                // Defaults for new
                if(document.getElementById('prod-stock')) document.getElementById('prod-stock').value = 10;
            }

            modal.classList.add('modal--active');

            // Save handler
            form.onsubmit = (e) => {
                e.preventDefault();
                this.saveProduct();
            };
        },

        saveProduct: async function() {
            const id = document.getElementById('prod-id').value;
            const imagesStr = document.getElementById('prod-images').value;
            const images = imagesStr.split(',').map(s => s.trim()).filter(s => s.length > 0);

            const productData = {
                id: id ? id : undefined,
                name: document.getElementById('prod-name').value.trim(),
                category: document.getElementById('prod-category').value,
                price: parseFloat(document.getElementById('prod-price').value) || 0,
                salePrice: parseFloat(document.getElementById('prod-sale-price').value) || null,
                description: document.getElementById('prod-desc').value.trim(),
                stock: parseInt(document.getElementById('prod-stock').value) || 0,
                isAvailable: (parseInt(document.getElementById('prod-stock').value) || 0) > 0,
                isFeatured: document.getElementById('prod-featured').checked,
                isOnSale: document.getElementById('prod-sale').checked,
                images: images,
                dimensions: {
                    width: document.getElementById('prod-dim-w').value.trim(),
                    height: document.getElementById('prod-dim-h').value.trim()
                }
            };

            const submitBtn = document.querySelector('#admin-product-form button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            try {
                await BambooShop.products.save(productData);
                BambooShop.ui.showToast('Product saved successfully', 'success');
                document.getElementById('admin-product-modal').classList.remove('modal--active');
                this.renderProducts();
            } catch (err) {
                console.error("Error saving product: ", err);
                BambooShop.ui.showToast('Failed to save product', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        },

        deleteProduct: async function(id) {
            if (confirm(BambooShop.i18n.t('admin.confirm_delete'))) {
                try {
                    await BambooShop.products.remove(id);
                    BambooShop.ui.showToast('Product deleted', 'success');
                    this.renderProducts();
                } catch(err) {
                    console.error("Delete product error: ", err);
                    BambooShop.ui.showToast('Failed to delete product', 'error');
                }
            }
        },

        renderOrders: function() {
            const orders = BambooShop.utils.safeLocalStorage.get('bamboo_orders') || [];
            // Sort newest first
            orders.sort((a,b) => b.createdAt - a.createdAt);

            const tbody = document.getElementById('admin-orders-tbody');
            if (!tbody) return;

            if (orders.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:var(--space-8)">No orders found</td></tr>`;
                return;
            }

            let html = '';
            orders.forEach(o => {
                const date = new Date(o.createdAt).toLocaleDateString('en-GB');
                let badgeClass = 'order-status--new';
                if (o.status === 'processing') badgeClass = 'order-status--processing';
                if (o.status === 'delivered') badgeClass = 'order-status--delivered';
                if (o.status === 'cancelled') badgeClass = 'order-status--cancelled';

                html += `
                    <tr style="cursor:pointer" onclick="adminController.openOrderDetails('${o.id}')">
                        <td><strong>${BambooShop.utils.sanitizeHTML(o.orderNumber)}</strong></td>
                        <td>${date}</td>
                        <td>${BambooShop.utils.sanitizeHTML(o.customer.name)}</td>
                        <td>${BambooShop.utils.formatPrice(o.totalMKD, 'MKD')}</td>
                        <td><span class="order-status ${badgeClass}">${o.status}</span></td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        },

        openOrderDetails: function(id) {
            const orders = BambooShop.utils.safeLocalStorage.get('bamboo_orders') || [];
            const o = orders.find(x => x.id === id);
            if (!o) return;

            const modal = document.getElementById('admin-order-modal');
            const content = document.getElementById('admin-order-content');

            const date = new Date(o.createdAt).toLocaleString('en-GB');

            let itemsHtml = '<ul style="list-style:none;padding:0">';
            o.items.forEach(i => {
                itemsHtml += `<li style="padding:8px 0;border-bottom:1px solid #eee;display:flex;justify-content:space-between">
                    <span>${i.quantity}x ${BambooShop.utils.sanitizeHTML(i.name)}</span>
                    <span>${BambooShop.utils.formatPrice(i.priceMKD * i.quantity, 'MKD')}</span>
                </li>`;
            });
            itemsHtml += `</ul>`;

            content.innerHTML = `
                <div class="flex flex--between" style="margin-bottom:16px">
                    <h3>Order ${o.orderNumber}</h3>
                    <span class="order-status order-status--${o.status}">${o.status}</span>
                </div>
                <div class="grid grid--2" style="margin-bottom:24px">
                    <div>
                        <strong>Date:</strong> ${date}<br>
                        <strong>Total:</strong> ${BambooShop.utils.formatPrice(o.totalMKD, 'MKD')}
                    </div>
                    <div>
                        <strong>Customer:</strong> ${BambooShop.utils.sanitizeHTML(o.customer.name)}<br>
                        <strong>Phone:</strong> <a href="tel:${BambooShop.utils.sanitizeHTML(o.customer.phone)}">${BambooShop.utils.sanitizeHTML(o.customer.phone)}</a><br>
                        <strong>Address:</strong> ${BambooShop.utils.sanitizeHTML(o.customer.address)}, ${BambooShop.utils.sanitizeHTML(o.customer.city)}
                    </div>
                </div>
                ${o.customer.notes ? `
                <div style="background-color: #f7f5f0; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid var(--bamboo-gold); font-size: 0.95rem; line-height: 1.5; color: var(--charcoal);">
                    <strong data-i18n="admin.order_notes">Забелешки:</strong> ${BambooShop.utils.sanitizeHTML(o.customer.notes)}
                </div>
                ` : ''}
                <h4>Items</h4>
                ${itemsHtml}
                
                <div style="margin-top:24px; display:flex; gap:8px; flex-wrap:wrap">
                    ${o.status !== 'processing' && o.status !== 'delivered' && o.status !== 'cancelled' ? `<button class="btn btn--secondary" onclick="adminController.updateOrderStatus('${o.id}', 'processing')">Mark Processing</button>` : ''}
                    ${o.status !== 'delivered' && o.status !== 'cancelled' ? `<button class="btn btn--primary" onclick="adminController.updateOrderStatus('${o.id}', 'delivered')">Mark Delivered</button>` : ''}
                    ${o.status !== 'cancelled' ? `<button class="btn btn--outline" style="color:var(--error);border-color:var(--error)" onclick="adminController.updateOrderStatus('${o.id}', 'cancelled')">Cancel Order</button>` : ''}
                    <button class="btn btn--outline" style="color:var(--error);border-color:var(--error);margin-left:auto" onclick="adminController.deleteOrder('${o.id}')">🗑️ Delete</button>
                </div>
            `;

            modal.classList.add('modal--active');
        },

        updateOrderStatus: async function(id, status) {
            const orders = BambooShop.utils.safeLocalStorage.get('bamboo_orders') || [];
            const index = orders.findIndex(x => x.id === id);
            if (index === -1) return;

            const order = orders[index];
            const previousStatus = order.status;
            order.status = status;
            BambooShop.utils.safeLocalStorage.set('bamboo_orders', orders);

            // Update Firestore if available
            if (window.BambooShop.firebase && window.BambooShop.firebase.updateOrderStatus) {
                window.BambooShop.firebase.updateOrderStatus(id, status).catch(e => console.error('Firestore order update failed', e));
            }

            // If cancelling an active order, restore stock for every item
            const wasActive = previousStatus !== 'cancelled' && previousStatus !== 'delivered';
            if (status === 'cancelled' && wasActive) {
                await this._restoreOrderStock(order);
            }

            BambooShop.ui.showToast('Order updated', 'success');
            document.getElementById('admin-order-modal').classList.remove('modal--active');
            this.renderOrders();
            this.renderDashboard();
        },

        deleteOrder: async function(id) {
            if (!confirm('Are you sure you want to permanently delete this order? This cannot be undone.')) return;

            const orders = BambooShop.utils.safeLocalStorage.get('bamboo_orders') || [];
            const order = orders.find(x => x.id === id);
            if (!order) return;

            // Restore stock if the order was NOT already cancelled or delivered
            const wasActive = order.status !== 'cancelled' && order.status !== 'delivered';
            if (wasActive) {
                await this._restoreOrderStock(order);
            }

            // Remove from localStorage
            const updated = orders.filter(x => x.id !== id);
            BambooShop.utils.safeLocalStorage.set('bamboo_orders', updated);

            BambooShop.ui.showToast('Order deleted', 'success');
            document.getElementById('admin-order-modal').classList.remove('modal--active');
            this.renderOrders();
            this.renderDashboard();
        },

        // Internal helper: increment stock back for every item in an order
        _restoreOrderStock: async function(order) {
            if (!order.items || !BambooShop.products) return;
            await Promise.all(
                order.items.map(item => {
                    // Restore quantity to the product's stock
                    const product = BambooShop.products.getById(item.productId);
                    if (!product) return Promise.resolve();

                    const currentStock = typeof product.stock !== 'undefined' ? product.stock : 0;
                    const restoredStock = currentStock + item.quantity;

                    // Update local cache
                    const all = BambooShop.products.getAll();
                    const idx = all.findIndex(p => p.id === item.productId);
                    if (idx !== -1) {
                        all[idx].stock = restoredStock;
                        all[idx].isAvailable = restoredStock > 0;
                        // Sync local cache (internal detail of products module — we do it via save)
                    }

                    // Push to Firestore atomically
                    if (window.BambooShop.firebase && window.BambooShop.firebase.decrementStock) {
                        // decrementStock with a negative number = increment
                        return window.BambooShop.firebase.decrementStock(item.productId, -item.quantity)
                            .catch(e => console.error('Stock restore failed for', item.productId, e));
                    }
                    return Promise.resolve();
                })
            );
            // Re-initialize products from Firestore so local cache refreshes
            if (window.BambooShop.firebase && window.BambooShop.firebase.getProducts) {
                window.BambooShop.firebase.getProducts().then(products => {
                    if (products && products.length > 0) {
                        BambooShop.utils.safeLocalStorage.set('bamboo_products', products);
                    }
                }).catch(() => {});
            }
        }
    };

    window.BambooShop.admin = admin;
})();
