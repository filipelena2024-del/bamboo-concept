(function() {
    'use strict';
    window.BambooShop = window.BambooShop || {};

    // Common UI utilities that multiple pages might need
    const ui = {
        showToast: function(message, type = 'info') {
            let container = document.getElementById('toast-container');
            if (!container) {
                container = BambooShop.utils.createElement('div', 'toast-container');
                container.id = 'toast-container';
                document.body.appendChild(container);
            }

            const toast = BambooShop.utils.createElement('div', `toast toast--${type}`);
            
            // Icon based on type
            let iconSvg = '';
            if (type === 'success') {
                iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--moss)"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
            } else if (type === 'error') {
                iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--error)"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
            } else {
                iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--bamboo-gold)"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
            }

            toast.innerHTML = `
                ${iconSvg}
                <span>${BambooShop.utils.sanitizeHTML(message)}</span>
            `;

            container.appendChild(toast);

            // Remove after 4 seconds
            setTimeout(() => {
                toast.style.animation = 'slideInBottom 0.3s ease-in reverse forwards';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, 4000);
        },

        createProductCardHTML: function(product) {
            const stock = typeof product.stock !== 'undefined' ? product.stock : 10;
            const isAvailable = stock > 0;
            const price = product.isOnSale && product.salePrice ? product.salePrice : product.price;
            const displayPrice = BambooShop.i18n.formatPriceDisplay(price);
            
            let badgesHTML = '';
            if (!isAvailable) {
                badgesHTML += `<span class="badge" style="background:var(--error);color:white" data-i18n="product.out_of_stock">Out of Stock</span>`;
            } else if (product.isOnSale) {
                badgesHTML += `<span class="badge badge--sale">Sale</span>`;
            } else if (product.isFeatured) {
                badgesHTML += `<span class="badge badge--new">Featured</span>`;
            }

            let priceHTML = `<span class="product-card__price">${displayPrice}</span>`;
            if (product.isOnSale && product.salePrice) {
                const oldPrice = BambooShop.i18n.formatPriceDisplay(product.price);
                priceHTML = `
                    <span class="product-card__price">${displayPrice}</span>
                    <span class="product-card__price--old">${oldPrice}</span>
                `;
            }

            // Find category name
            const catObj = BambooShop.products.CATEGORIES.find(c => c.id === product.category);
            const catNameKey = catObj ? catObj.nameKey : '';

            // Using sanitized data
            const cleanName = BambooShop.utils.sanitizeHTML(product.name);
            const cleanId = BambooShop.utils.sanitizeHTML(product.id);
            const imageUrl = product.images && product.images.length > 0 ? product.images[0] : 'assets/images/placeholder.jpg';

            return `
                <a href="product.html?id=${cleanId}" class="product-card anim-fade-up" tabindex="0">
                    <div class="product-card__image">
                        <img src="${BambooShop.utils.sanitizeHTML(imageUrl)}" alt="${cleanName}" class="product-card__img" loading="lazy">
                        ${badgesHTML ? `<div class="product-card__badge">${badgesHTML}</div>` : ''}
                        ${!isAvailable ? `<div style="position:absolute;inset:0;background:rgba(255,255,255,0.6);z-index:1;"></div>` : ''}
                    </div>
                    <div class="product-card__info">
                        
                        <h3 class="product-card__name">${cleanName}</h3>
                        <div class="product-card__price-wrapper">
                            ${priceHTML}
                        </div>
                        <button type="button" class="btn btn--primary product-card__action js-add-to-cart" data-id="${cleanId}" ${!isAvailable ? 'disabled' : ''}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                            <span data-i18n="${isAvailable ? 'product.add_to_cart' : 'product.out_of_stock'}"></span>
                        </button>
                    </div>
                </a>
            `;
        }
    };
    
    window.BambooShop.ui = ui;

    // Main App Initialization
    const app = {
        
        initCookieBanner: function() {
            if (BambooShop.utils.safeLocalStorage.get('bamboo_cookie_consent')) {
                return; // Already consented/declined
            }

            const banner = document.createElement('div');
            banner.className = 'cookie-banner';
            banner.innerHTML = `
                <div class="cookie-banner__text" data-i18n="cookie.text">
                    We use cookies to improve your experience. By continuing to visit this site you agree to our use of cookies.
                </div>
                <div class="cookie-banner__actions">
                    <button class="btn btn--primary" id="cookie-accept" data-i18n="cookie.accept">Accept</button>
                    <button class="btn btn--ghost" style="color: var(--white); opacity: 0.6; font-size: 0.85rem; text-decoration: underline; background: transparent; border: none; padding: var(--space-1) var(--space-2);" id="cookie-decline" data-i18n="cookie.decline">Decline</button>
                </div>
            `;

            document.body.appendChild(banner);

            // Apply translations to the new dynamic element immediately
            if (BambooShop.i18n) {
                BambooShop.i18n.applyTranslations();
            }

            // Animate in
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    banner.classList.add('cookie-banner--visible');
                });
            });

            const closeBanner = (consent) => {
                BambooShop.utils.safeLocalStorage.set('bamboo_cookie_consent', consent);
                banner.classList.remove('cookie-banner--visible');
                setTimeout(() => {
                    if (banner.parentNode) {
                        banner.parentNode.removeChild(banner);
                    }
                }, 600); // Wait for transition
            };

            document.getElementById('cookie-accept').addEventListener('click', () => closeBanner(true));
            document.getElementById('cookie-decline').addEventListener('click', () => closeBanner(false));
        },

init: function() {


            // Initialize modules in correct order
            BambooShop.i18n.init();
            
            
            this.initCookieBanner();
// Wait for products to load before initializing cart and page logic
            window.addEventListener('bamboo_products_loaded', () => {
                if (BambooShop.cart) BambooShop.cart.init();
                this.setupNavigation();
                this.setupFooter();
                this.setupGlobalHandlers();
                this.initPageLogic();
                
                // Initialize animations if present
                if (BambooShop.animations && typeof BambooShop.animations.init === 'function') {
                    BambooShop.animations.init();
                }

                // Re-apply translations after everything is rendered
                BambooShop.i18n.applyTranslations();
            });

            // Force scroll to top on refresh/load
            if ('scrollRestoration' in history) {
                history.scrollRestoration = 'manual';
            }
            window.scrollTo(0, 0);

            // Trigger products init
            BambooShop.products.init();
        },

        setupNavigation: function() {
            const nav = document.querySelector('.nav');
            const mobileToggle = document.querySelector('.nav__mobile-toggle');
            const mobileMenu = document.querySelector('.nav__menu');
            const mobileOverlay = document.querySelector('.nav__mobile-overlay');

            // Scroll effect
            if (nav) {
                const handleScroll = BambooShop.utils.throttle(() => {
                    if (window.scrollY > 50) {
                        nav.classList.add('nav--scrolled');
                    } else {
                        nav.classList.remove('nav--scrolled');
                    }
                }, 100);
                window.addEventListener('scroll', handleScroll);
                handleScroll(); // Check initial state
            }

            // Mobile menu toggle
            const toggleMenu = () => {
                const isOpen = mobileMenu.classList.contains('nav__menu--open');
                if (isOpen) {
                    mobileMenu.classList.remove('nav__menu--open');
                    mobileToggle.classList.remove('nav__mobile-toggle--open');
                    mobileOverlay.classList.remove('nav__mobile-overlay--open');
                    document.body.style.overflow = ''; // Restore scroll
                    mobileToggle.setAttribute('aria-expanded', 'false');
                } else {
                    mobileMenu.classList.add('nav__menu--open');
                    mobileToggle.classList.add('nav__mobile-toggle--open');
                    mobileOverlay.classList.add('nav__mobile-overlay--open');
                    document.body.style.overflow = 'hidden'; // Lock scroll
                    mobileToggle.setAttribute('aria-expanded', 'true');
                }
            };

            if (mobileToggle && mobileMenu && mobileOverlay) {
                mobileToggle.addEventListener('click', toggleMenu);
                mobileOverlay.addEventListener('click', toggleMenu);
            }

            // Active state for current page
            const path = window.location.pathname;
            const links = document.querySelectorAll('.nav__link');
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (href && path.endsWith(href) && href !== '#') {
                    link.classList.add('nav__link--active');
                } else if (path.endsWith('/') && href === 'index.html') {
                    link.classList.add('nav__link--active');
                }
            });
        },

        setupFooter: function() {
            // Replaced by i18n parameter substitution {year}, but fallback here
            const yearSpan = document.getElementById('copyright-year');
            if (yearSpan) {
                yearSpan.textContent = new Date().getFullYear();
            }
        },

        setupGlobalHandlers: function() {
            // Global event delegation for add-to-cart buttons
            document.body.addEventListener('click', (e) => {
                // Find closest button with js-add-to-cart class
                const btn = e.target.closest('.js-add-to-cart');
                if (btn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const productId = btn.getAttribute('data-id');
                    if (productId) {
                        // Prevent multiple clicks quickly
                        if (btn.disabled) return;
                        const originalHtml = btn.innerHTML;
                        btn.disabled = true;
                        
                        // Add spinner to button
                        btn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px;border-top-color:var(--charcoal);"></span>`;
                        
                        BambooShop.cart.addItem(productId, 1);
                        
                        setTimeout(() => {
                            btn.innerHTML = originalHtml;
                            btn.disabled = false;
                        }, 500);
                    }
                }
            });

            // Close things on Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    // Close mobile menu
                    const mobileMenu = document.querySelector('.nav__menu');
                    const mobileToggle = document.querySelector('.nav__mobile-toggle');
                    if (mobileMenu && mobileMenu.classList.contains('nav__menu--open')) {
                        mobileToggle.click();
                    }

                    // Close dropdowns
                    document.querySelectorAll('.dropdown--open').forEach(d => d.classList.remove('dropdown--open'));
                    
                    // Close modals
                    document.querySelectorAll('.modal--active').forEach(m => m.classList.remove('modal--active'));
                }
            });
            
            // Listen to language/currency changes to re-render pages
            BambooShop.i18n.onStateChange(() => {
                // Re-apply translations
                BambooShop.i18n.applyTranslations();
            });
        },

        initPageLogic: function() {
            const pageId = document.body.getAttribute('data-page');
            if (!pageId) return;



            switch (pageId) {
                case 'shop':
                    if (BambooShop.shop && typeof BambooShop.shop.init === 'function') {
                        BambooShop.shop.init();
                    }
                    break;
                case 'product':
                    if (BambooShop.productDetail && typeof BambooShop.productDetail.init === 'function') {
                        BambooShop.productDetail.init();
                    }
                    break;
                case 'cart':
                    if (BambooShop.order && typeof BambooShop.order.init === 'function') {
                        BambooShop.order.init();
                    }
                    break;
                case 'admin':
                    if (BambooShop.admin && typeof BambooShop.admin.init === 'function') {
                        BambooShop.admin.init();
                    }
                    break;
            }
        }
    };

    window.BambooShop.app = app;

    // Start everything when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => app.init());
    } else {
        app.init();
    }
})();
