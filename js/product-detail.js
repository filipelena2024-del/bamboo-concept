(function() {
    'use strict';
    window.BambooShop = window.BambooShop || {};

    const productDetail = {
        init: function() {
            const productId = BambooShop.utils.getQueryParam('id');
            if (!productId) {
                window.location.href = 'shop.html';
                return;
            }

            this.product = BambooShop.products.getById(productId);
            if (!this.product) {
                // Show error state
                const container = document.getElementById('product-container');
                if (container) {
                    container.innerHTML = `
                        <div class="empty-state container" style="margin-top:120px;">
                            <div class="empty-state__icon">⚠️</div>
                            <h2 class="empty-state__title" data-i18n="common.error">Product not found</h2>
                            <a href="shop.html" class="btn btn--primary" data-i18n="shop.title">Back to Shop</a>
                        </div>
                    `;
                    BambooShop.i18n.applyTranslations();
                }
                return;
            }

            this.renderProduct();
            this.setupListeners();
            this.renderRelated();

            // Re-render prices on currency change
            BambooShop.i18n.onStateChange((type) => {
                if (type === 'currency' || type === 'lang') {
                    this.updatePrices();
                }
            });
        },

        renderProduct: function() {
            const p = this.product;
            
            // Set Page Title
            document.title = `${p.name} | Bamboo Concept`;

            // Breadcrumb
            const breadcrumbCat = document.getElementById('breadcrumb-category');
            if (breadcrumbCat) {
                const catObj = BambooShop.products.CATEGORIES.find(c => c.id === p.category);
                if (catObj) {
                    breadcrumbCat.setAttribute('data-i18n', catObj.nameKey);
                    breadcrumbCat.href = `shop.html?category=${p.category}`;
                }
            }
            const breadcrumbName = document.getElementById('breadcrumb-name');
            if (breadcrumbName) breadcrumbName.textContent = p.name;

            // Info
            const nameEl = document.getElementById('pd-name');
            if (nameEl) nameEl.textContent = p.name;
            
            this.updatePrices();

            const descEl = document.getElementById('pd-description');
            if (descEl && p.description) descEl.innerHTML = BambooShop.utils.sanitizeHTML(p.description).replace(/\n/g, '<br>');

            // Features
            const featuresEl = document.getElementById('pd-features');
            if (featuresEl && p.features && p.features.length > 0) {
                featuresEl.innerHTML = p.features.map(f => `<li>${BambooShop.utils.sanitizeHTML(f)}</li>`).join('');
            }

            // Dimensions Table
            const dimTable = document.getElementById('pd-dimensions');
            if (dimTable && p.dimensions) {
                let html = '';
                if (p.dimensions.width) html += `<tr><th data-i18n="product.width"></th><td>${BambooShop.utils.sanitizeHTML(p.dimensions.width)}</td></tr>`;
                if (p.dimensions.height) html += `<tr><th data-i18n="product.height"></th><td>${BambooShop.utils.sanitizeHTML(p.dimensions.height)}</td></tr>`;
                if (p.dimensions.depth) html += `<tr><th data-i18n="product.depth"></th><td>${BambooShop.utils.sanitizeHTML(p.dimensions.depth)}</td></tr>`;
                if (p.dimensions.weight) html += `<tr><th data-i18n="product.weight"></th><td>${BambooShop.utils.sanitizeHTML(p.dimensions.weight)}</td></tr>`;
                dimTable.innerHTML = html;
            }

            // Availability
            
            const stockStatus = document.getElementById('pd-stock-status');
            const actionBtn = document.getElementById('pd-add-to-cart');
            
            if (stockStatus) {
                const stock = typeof p.stock !== 'undefined' ? p.stock : 10;
                if (stock > 0) {
                    stockStatus.textContent = 'На залиха';
                    stockStatus.style.color = 'var(--moss)'; // Green
                } else {
                    stockStatus.textContent = 'Нема залиха';
                    stockStatus.style.color = 'var(--error)'; // Red
                }
            }

            if (actionBtn && (p.stock === 0 || !p.isAvailable)) {
                actionBtn.disabled = true;
                actionBtn.querySelector('span').setAttribute('data-i18n', 'product.out_of_stock');
                actionBtn.querySelector('span').textContent = 'Нема залиха';
            }
    

            // Gallery
            const mainImg = document.getElementById('pd-main-img');
            const thumbsContainer = document.getElementById('pd-thumbs');
            
            if (mainImg && p.images && p.images.length > 0) {
                mainImg.src = p.images[0];
                mainImg.alt = p.name;

                if (thumbsContainer) {
                    let thumbsHtml = '';
                    p.images.forEach((img, idx) => {
                        thumbsHtml += `
                            <div class="product-gallery__thumb ${idx === 0 ? 'product-gallery__thumb--active' : ''}" data-index="${idx}">
                                <img src="${BambooShop.utils.sanitizeHTML(img)}" alt="${BambooShop.utils.sanitizeHTML(p.name)} - thumbnail">
                            </div>
                        `;
                    });
                    thumbsContainer.innerHTML = thumbsHtml;
                }
            }

            // Variants (e.g. colour swatches for Папасан)
            this.renderVariants(p);

            // Re-apply translations for dynamically added text
            BambooShop.i18n.applyTranslations();
        },

        renderVariants: function(p) {
            const variantsWrapper = document.getElementById('pd-variants');
            const swatchesContainer = document.getElementById('pd-variant-swatches');
            const selectedLabel = document.getElementById('pd-selected-variant');
            const mainImg = document.getElementById('pd-main-img');
            const thumbsContainer = document.getElementById('pd-thumbs');

            if (!p.variants || p.variants.length === 0 || !variantsWrapper) return;

            // Show the wrapper
            variantsWrapper.style.display = 'block';

            // Select first variant by default
            let activeVariant = p.variants[0];
            if (selectedLabel) selectedLabel.textContent = activeVariant.label;
            if (mainImg) mainImg.src = activeVariant.image;

            // Hide regular thumbnails — swatches replace them
            if (thumbsContainer) thumbsContainer.style.display = 'none';

            // Build swatches
            swatchesContainer.innerHTML = '';
            p.variants.forEach((variant, idx) => {
                const swatch = document.createElement('button');
                swatch.type = 'button';
                swatch.title = variant.label;
                swatch.setAttribute('aria-label', variant.label);
                swatch.style.cssText = `
                    width: 48px; height: 48px; border-radius: 50%;
                    border: 3px solid ${idx === 0 ? 'var(--bamboo-gold)' : '#ddd'};
                    background-color: ${variant.color};
                    cursor: pointer; transition: border-color 0.2s, transform 0.2s;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 0.65rem; font-weight: 700; color: var(--charcoal);
                    padding: 0; overflow: hidden;
                `;
                // Add small thumbnail inside the swatch circle
                const img = document.createElement('img');
                img.src = variant.image;
                img.alt = variant.label;
                img.style.cssText = 'width:100%; height:100%; object-fit:cover; border-radius:50%;';
                swatch.appendChild(img);

                swatch.addEventListener('click', () => {
                    // Update active border on all swatches
                    swatchesContainer.querySelectorAll('button').forEach(b => b.style.borderColor = '#ddd');
                    swatch.style.borderColor = 'var(--bamboo-gold)';
                    swatch.style.transform = 'scale(1.1)';
                    setTimeout(() => swatch.style.transform = 'scale(1)', 200);

                    // Update main image with smooth fade
                    if (mainImg) {
                        mainImg.style.opacity = '0.4';
                        mainImg.style.transition = 'opacity 0.2s';
                        setTimeout(() => {
                            mainImg.src = variant.image;
                            mainImg.style.opacity = '1';
                        }, 200);
                    }

                    // Update selected label
                    if (selectedLabel) selectedLabel.textContent = variant.label;
                    activeVariant = variant;
                });

                swatchesContainer.appendChild(swatch);
            });
        },

        updatePrices: function() {
            const priceEl = document.getElementById('pd-price');
            const oldPriceEl = document.getElementById('pd-old-price');
            
            if (!priceEl) return;

            const price = this.product.isOnSale && this.product.salePrice ? this.product.salePrice : this.product.price;
            priceEl.textContent = BambooShop.i18n.formatPriceDisplay(price);

            if (this.product.isOnSale && this.product.salePrice && oldPriceEl) {
                oldPriceEl.textContent = BambooShop.i18n.formatPriceDisplay(this.product.price);
                oldPriceEl.style.display = 'inline-block';
            } else if (oldPriceEl) {
                oldPriceEl.style.display = 'none';
            }
        },

        setupListeners: function() {
            // Quantity
            const qtyInput = document.getElementById('pd-qty');
            const btnMinus = document.getElementById('pd-qty-minus');
            const btnPlus = document.getElementById('pd-qty-plus');

            if (qtyInput && btnMinus && btnPlus) {
                btnMinus.addEventListener('click', () => {
                    let val = parseInt(qtyInput.value) || 1;
                    if (val > 1) qtyInput.value = val - 1;
                });
                btnPlus.addEventListener('click', () => {
                    let val = parseInt(qtyInput.value) || 1;
                    if (val < 99) qtyInput.value = val + 1;
                });
                qtyInput.addEventListener('change', () => {
                    let val = parseInt(qtyInput.value) || 1;
                    if (val < 1) val = 1;
                    if (val > 99) val = 99;
                    qtyInput.value = val;
                });
            }

            // Add to Cart
            const addBtn = document.getElementById('pd-add-to-cart');
            if (addBtn && this.product.isAvailable) {
                addBtn.addEventListener('click', () => {
                    const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
                    
                    const originalHtml = addBtn.innerHTML;
                    addBtn.disabled = true;
                    addBtn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px;border-top-color:var(--charcoal);"></span>`;
                    
                    BambooShop.cart.addItem(this.product.id, qty);
                    
                    setTimeout(() => {
                        addBtn.innerHTML = originalHtml;
                        addBtn.disabled = false;
                    }, 500);
                });
            }

            // Gallery Thumbnails
            const thumbsContainer = document.getElementById('pd-thumbs');
            const mainImg = document.getElementById('pd-main-img');
            if (thumbsContainer && mainImg) {
                thumbsContainer.addEventListener('click', (e) => {
                    const thumb = e.target.closest('.product-gallery__thumb');
                    if (thumb) {
                        // Update active class
                        thumbsContainer.querySelectorAll('.product-gallery__thumb').forEach(t => t.classList.remove('product-gallery__thumb--active'));
                        thumb.classList.add('product-gallery__thumb--active');
                        
                        // Update main image
                        const img = thumb.querySelector('img');
                        if (img) mainImg.src = img.src;
                    }
                });
            }

            // Main Image Lightbox
            const lightbox = document.getElementById('lightbox-modal');
            const lightboxImg = document.getElementById('lightbox-img');
            const lightboxClose = document.getElementById('lightbox-close');

            if (mainImg && lightbox && lightboxImg) {
                mainImg.parentElement.addEventListener('click', () => {
                    lightboxImg.src = mainImg.src;
                    lightbox.classList.add('modal--active');
                });
            }
            if (lightboxClose && lightbox) {
                lightboxClose.addEventListener('click', () => {
                    lightbox.classList.remove('modal--active');
                });
            }

            // Tabs
            const tabBtns = document.querySelectorAll('.product-tabs__btn');
            const tabPanes = document.querySelectorAll('.product-tabs__pane');
            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetId = btn.getAttribute('data-tab');
                    tabBtns.forEach(b => b.classList.remove('product-tabs__btn--active'));
                    tabPanes.forEach(p => p.classList.remove('product-tabs__pane--active'));
                    
                    btn.classList.add('product-tabs__btn--active');
                    const targetPane = document.getElementById(targetId);
                    if (targetPane) targetPane.classList.add('product-tabs__pane--active');
                });
            });
        },

        renderRelated: function() {
            const container = document.getElementById('related-grid');
            if (!container) return;

            // Get products in same category, exclude current
            let related = BambooShop.products.getByCategory(this.product.category)
                .filter(p => p.id !== this.product.id)
                .slice(0, 4);
            
            // If not enough, pad with featured
            if (related.length < 4) {
                const featured = BambooShop.products.getFeatured()
                    .filter(p => p.id !== this.product.id && !related.find(r => r.id === p.id));
                related = [...related, ...featured].slice(0, 4);
            }

            if (related.length === 0) {
                document.getElementById('related-section').style.display = 'none';
                return;
            }

            container.innerHTML = related.map(p => BambooShop.ui.createProductCardHTML(p)).join('');
            BambooShop.i18n.applyTranslations();
        }
    };

    window.BambooShop.productDetail = productDetail;
})();
