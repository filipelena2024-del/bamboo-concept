(function() {
    'use strict';
    window.BambooShop = window.BambooShop || {};

    const order = {
        init: function() {
            this.cartItemsContainer = document.getElementById('cart-items-container');
            this.cartSummaryContainer = document.getElementById('cart-summary');
            this.emptyStateElement = document.getElementById('cart-empty-state');
            this.cartLayoutElement = document.getElementById('cart-layout');
            this.form = document.getElementById('order-form');

            if (!this.cartItemsContainer) return;

            // Render initially
            this.render();

            // Listen for cart changes
            BambooShop.cart.onCartChange(() => {
                this.render();
            });

            // Listen for currency changes
            BambooShop.i18n.onStateChange((type) => {
                if (type === 'currency' || type === 'lang') {
                    this.render();
                }
            });

            this.setupForm();
        },

        render: function() {
            const items = BambooShop.cart.getItems();
            
            if (items.length === 0) {
                this.cartLayoutElement.style.display = 'none';
                this.emptyStateElement.style.display = 'flex';
                return;
            }

            this.cartLayoutElement.style.display = 'grid'; // CSS handles actual grid
            this.emptyStateElement.style.display = 'none';

            // Render Items
            let html = '';
            items.forEach(item => {
                const price = item.isOnSale && item.salePrice ? item.salePrice : item.price;
                const displayPrice = BambooShop.i18n.formatPriceDisplay(price);
                const imageUrl = item.images && item.images.length > 0 ? item.images[0] : 'assets/images/placeholder.jpg';
                
                html += `
                    <div class="cart-item">
                        <img src="${BambooShop.utils.sanitizeHTML(imageUrl)}" alt="${BambooShop.utils.sanitizeHTML(item.name)}" class="cart-item__image">
                        <div class="cart-item__details">
                            <h4 class="cart-item__name">${BambooShop.utils.sanitizeHTML(item.name)}</h4>
                            <div class="cart-item__price">${displayPrice}</div>
                            <div class="cart-item__controls">
                                <div class="cart-item__qty">
                                    <button type="button" class="cart-item__qty-btn js-qty-minus" data-id="${item.id}">-</button>
                                    <input type="number" class="cart-item__qty-input js-qty-input" data-id="${item.id}" value="${item.quantity}" min="1" max="99">
                                    <button type="button" class="cart-item__qty-btn js-qty-plus" data-id="${item.id}">+</button>
                                </div>
                                <button type="button" class="cart-item__remove js-remove-item" data-id="${item.id}" data-i18n="cart.remove"></button>
                            </div>
                        </div>
                    </div>
                `;
            });
            this.cartItemsContainer.innerHTML = html;

            // Render Summary
            const subtotal = BambooShop.cart.getSubtotal();
            const delivery = BambooShop.cart.getDeliveryFee();
            const total = BambooShop.cart.getTotal();

            document.getElementById('summary-subtotal').textContent = BambooShop.i18n.formatPriceDisplay(subtotal);
            
            const deliveryEl = document.getElementById('summary-delivery');
            if (delivery === 0) {
                deliveryEl.textContent = BambooShop.i18n.t('cart.delivery_free');
                deliveryEl.style.color = 'var(--moss)';
            } else {
                deliveryEl.textContent = BambooShop.i18n.formatPriceDisplay(delivery);
                deliveryEl.style.color = '';
            }

            document.getElementById('summary-total').textContent = BambooShop.i18n.formatPriceDisplay(total);

            // Re-apply translations for injected HTML
            BambooShop.i18n.applyTranslations();

            this.setupItemListeners();
        },

        setupItemListeners: function() {
            // Detach old listeners implicitly by recreating HTML, now attach via delegation on container
            // Or just query the elements we just added
            
            const minusBtns = this.cartItemsContainer.querySelectorAll('.js-qty-minus');
            const plusBtns = this.cartItemsContainer.querySelectorAll('.js-qty-plus');
            const inputs = this.cartItemsContainer.querySelectorAll('.js-qty-input');
            const removeBtns = this.cartItemsContainer.querySelectorAll('.js-remove-item');

            minusBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    const input = this.cartItemsContainer.querySelector(`input[data-id="${id}"]`);
                    let val = parseInt(input.value);
                    if (val > 1) BambooShop.cart.updateQuantity(id, val - 1);
                });
            });

            plusBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    const input = this.cartItemsContainer.querySelector(`input[data-id="${id}"]`);
                    let val = parseInt(input.value);
                    if (val < 99) BambooShop.cart.updateQuantity(id, val + 1);
                });
            });

            inputs.forEach(input => {
                input.addEventListener('change', () => {
                    const id = input.getAttribute('data-id');
                    let val = parseInt(input.value);
                    if (isNaN(val) || val < 1) val = 1;
                    if (val > 99) val = 99;
                    BambooShop.cart.updateQuantity(id, val);
                });
            });

            removeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    BambooShop.cart.removeItem(id);
                });
            });
        },

        setupForm: function() {
            if (!this.form) return;

            const nameInput = document.getElementById('order-name');
            const phoneInput = document.getElementById('order-phone');
            const addressInput = document.getElementById('order-address');
            const cityInput = document.getElementById('order-city');
            const submitBtn = document.getElementById('order-submit');

            const validateField = (input, validator, errorMsgKey) => {
                const val = input.value.trim();
                const errorEl = document.getElementById(`${input.id}-error`);
                let isValid = false;

                if (typeof validator === 'function') {
                    isValid = validator(val);
                } else if (validator === 'required') {
                    isValid = val.length > 0;
                }

                if (!isValid && val.length > 0) {
                    input.classList.add('form-group__input--error');
                    if (errorEl) {
                        errorEl.setAttribute('data-i18n', errorMsgKey);
                        errorEl.textContent = BambooShop.i18n.t(errorMsgKey);
                        errorEl.style.display = 'block';
                    }
                } else {
                    input.classList.remove('form-group__input--error');
                    if (errorEl) errorEl.style.display = 'none';
                }

                return isValid;
            };

            // Blur validations
            if (nameInput) nameInput.addEventListener('blur', () => validateField(nameInput, 'required', 'order.required'));
            if (phoneInput) phoneInput.addEventListener('blur', () => validateField(phoneInput, BambooShop.utils.validatePhone, 'order.invalid_phone'));
            if (addressInput) addressInput.addEventListener('blur', () => validateField(addressInput, 'required', 'order.required'));
            if (cityInput) cityInput.addEventListener('blur', () => validateField(cityInput, 'required', 'order.required'));

            this.form.addEventListener('submit', (e) => {
                e.preventDefault();

                // Validate all
                const isNameValid = validateField(nameInput, 'required', 'order.required');
                const isPhoneValid = validateField(phoneInput, BambooShop.utils.validatePhone, 'order.invalid_phone');
                const isAddressValid = validateField(addressInput, 'required', 'order.required');
                const isCityValid = validateField(cityInput, 'required', 'order.required');

                // Check cart not empty
                if (BambooShop.cart.getItems().length === 0) return;

                if (isNameValid && isPhoneValid && isAddressValid && isCityValid) {
                    // Create Order
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = `<span class="spinner" style="width:20px;height:20px;border-width:2px;"></span>`;

                    const orderData = {
                        id: BambooShop.utils.generateId(),
                        orderNumber: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
                        createdAt: Date.now(),
                        status: 'new',
                        totalMKD: BambooShop.cart.getTotal(),
                        items: BambooShop.cart.getItems().map(i => ({
                            productId: i.id,
                            name: i.name,
                            quantity: i.quantity,
                            priceMKD: i.isOnSale && i.salePrice ? i.salePrice : i.price
                        })),
                        customer: {
                            name: BambooShop.utils.sanitizeHTML(nameInput.value),
                            phone: BambooShop.utils.sanitizeHTML(phoneInput.value),
                            email: BambooShop.utils.sanitizeHTML(document.getElementById('order-email').value || ''),
                            address: BambooShop.utils.sanitizeHTML(addressInput.value),
                            city: BambooShop.utils.sanitizeHTML(cityInput.value),
                            postalCode: BambooShop.utils.sanitizeHTML(document.getElementById('order-postal').value || ''),
                            notes: BambooShop.utils.sanitizeHTML(document.getElementById('order-notes').value || '')
                        }
                    };

                    // Save Order to LocalStorage for Admin Panel
                    const savedOrders = BambooShop.utils.safeLocalStorage.get('bamboo_orders') || [];
                    savedOrders.push(orderData);
                    BambooShop.utils.safeLocalStorage.set('bamboo_orders', savedOrders);

                    // Simulate API delay
                    setTimeout(() => {
                        // Clear Cart
                        BambooShop.cart.clear();

                        // Show Success Modal
                        const modal = document.getElementById('success-modal');
                        const orderNumSpan = document.getElementById('success-order-number');
                        if (orderNumSpan) orderNumSpan.textContent = orderData.orderNumber;
                        if (modal) modal.classList.add('modal--active');

                    }, 800);
                }
            });
        }
    };

    window.BambooShop.order = order;
})();
