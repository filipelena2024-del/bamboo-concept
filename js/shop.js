(function() {
    'use strict';
    window.BambooShop = window.BambooShop || {};

    const PAGE_SIZE = 12;

    const shop = {
        state: {
            categories: [],
            priceMin: null,
            priceMax: null,
            inStockOnly: false,
            sortBy: 'newest', // 'newest', 'price-asc', 'price-desc', 'name'
            searchQuery: '',
            currentPage: 1
        },

        init: function() {
            this.gridElement = document.getElementById('shop-grid');
            this.countElement = document.getElementById('shop-result-count');
            this.paginationElement = document.getElementById('shop-pagination');
            this.emptyStateElement = document.getElementById('shop-empty-state');
            this.activeFiltersElement = document.getElementById('active-filters');
            
            if (!this.gridElement) return;

            this.readUrlState();
            this.setupListeners();
            this.renderFilters();
            this.applyStateAndRender();

            // Listen for translations changing (e.g. currency change) to re-render prices
            BambooShop.i18n.onStateChange((type) => {
                if (type === 'currency' || type === 'lang') {
                    this.applyStateAndRender();
                }
            });
        },

        readUrlState: function() {
            const cat = BambooShop.utils.getQueryParam('category');
            if (cat) this.state.categories = cat.split(',');

            const sort = BambooShop.utils.getQueryParam('sort');
            if (sort) this.state.sortBy = sort;

            const q = BambooShop.utils.getQueryParam('q');
            if (q) this.state.searchQuery = q;

            // Update UI to match
            const searchInput = document.getElementById('shop-search-input');
            if (searchInput && q) searchInput.value = q;
            
            const sortSelect = document.getElementById('shop-sort-select');
            if (sortSelect && sort) sortSelect.value = sort;
        },

        updateUrlState: function() {
            if (this.state.categories.length > 0) {
                BambooShop.utils.setQueryParam('category', this.state.categories.join(','));
            } else {
                BambooShop.utils.setQueryParam('category', '');
            }

            if (this.state.sortBy !== 'newest') {
                BambooShop.utils.setQueryParam('sort', this.state.sortBy);
            } else {
                BambooShop.utils.setQueryParam('sort', '');
            }

            if (this.state.searchQuery) {
                BambooShop.utils.setQueryParam('q', this.state.searchQuery);
            } else {
                BambooShop.utils.setQueryParam('q', '');
            }
        },

        setupListeners: function() {
            // Search
            const searchInput = document.getElementById('shop-search-input');
            if (searchInput) {
                searchInput.addEventListener('input', BambooShop.utils.debounce((e) => {
                    this.state.searchQuery = e.target.value.trim();
                    this.state.currentPage = 1;
                    this.updateUrlState();
                    this.applyStateAndRender();
                }, 300));
            }

            // Sort
            const sortSelect = document.getElementById('shop-sort-select');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    this.state.sortBy = e.target.value;
                    this.state.currentPage = 1;
                    this.updateUrlState();
                    this.applyStateAndRender();
                });
            }

            // Sidebar toggles for mobile
            const filterToggleBtn = document.getElementById('filter-toggle-btn');
            const filterSidebar = document.getElementById('filter-sidebar');
            const filterCloseBtn = document.getElementById('filter-close-btn');

            if (filterToggleBtn && filterSidebar) {
                filterToggleBtn.addEventListener('click', () => {
                    filterSidebar.classList.add('filter-sidebar--open');
                    document.body.style.overflow = 'hidden';
                });
            }

            if (filterCloseBtn && filterSidebar) {
                filterCloseBtn.addEventListener('click', () => {
                    filterSidebar.classList.remove('filter-sidebar--open');
                    document.body.style.overflow = '';
                });
            }
        },

        renderFilters: function() {
            const catContainer = document.getElementById('filter-categories');
            if (!catContainer) return;

            catContainer.innerHTML = '';
            
            BambooShop.products.CATEGORIES.forEach(cat => {
                const label = document.createElement('label');
                label.className = 'filter-checkbox';
                
                const isChecked = this.state.categories.includes(cat.id);
                
                label.innerHTML = `
                    <input type="checkbox" value="${cat.id}" ${isChecked ? 'checked' : ''}>
                    <span data-i18n="${cat.nameKey}"></span>
                `;
                
                const input = label.querySelector('input');
                input.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.state.categories.push(cat.id);
                    } else {
                        this.state.categories = this.state.categories.filter(id => id !== cat.id);
                    }
                    this.state.currentPage = 1;
                    this.updateUrlState();
                    this.applyStateAndRender();
                });
                
                catContainer.appendChild(label);
            });

            // Re-apply translations for new DOM elements
            BambooShop.i18n.applyTranslations();

            // Price range listener
            const priceMinInput = document.getElementById('filter-price-min');
            const priceMaxInput = document.getElementById('filter-price-max');
            const applyPriceBtn = document.getElementById('filter-price-apply');

            if (applyPriceBtn) {
                applyPriceBtn.addEventListener('click', () => {
                    const min = parseFloat(priceMinInput.value);
                    const max = parseFloat(priceMaxInput.value);
                    
                    this.state.priceMin = !isNaN(min) ? min : null;
                    this.state.priceMax = !isNaN(max) ? max : null;
                    this.state.currentPage = 1;
                    this.applyStateAndRender();
                });
            }

            // Availability
            const stockCheck = document.getElementById('filter-stock');
            if (stockCheck) {
                stockCheck.addEventListener('change', (e) => {
                    this.state.inStockOnly = e.target.checked;
                    this.state.currentPage = 1;
                    this.applyStateAndRender();
                });
            }
        },

        renderActiveFilters: function() {
            if (!this.activeFiltersElement) return;
            
            this.activeFiltersElement.innerHTML = '';
            
            let hasFilters = false;

            // Categories
            this.state.categories.forEach(catId => {
                const catObj = BambooShop.products.CATEGORIES.find(c => c.id === catId);
                if (catObj) {
                    hasFilters = true;
                    const chip = document.createElement('div');
                    chip.className = 'filter-chip';
                    chip.innerHTML = `
                        <span data-i18n="${catObj.nameKey}"></span>
                        <button type="button" aria-label="Remove filter">✕</button>
                    `;
                    chip.querySelector('button').addEventListener('click', () => {
                        this.state.categories = this.state.categories.filter(id => id !== catId);
                        // Update checkbox
                        const cb = document.querySelector(`input[value="${catId}"]`);
                        if (cb) cb.checked = false;
                        this.updateUrlState();
                        this.applyStateAndRender();
                    });
                    this.activeFiltersElement.appendChild(chip);
                }
            });

            // Search
            if (this.state.searchQuery) {
                hasFilters = true;
                const chip = document.createElement('div');
                chip.className = 'filter-chip';
                chip.innerHTML = `
                    <span>"${BambooShop.utils.sanitizeHTML(this.state.searchQuery)}"</span>
                    <button type="button">✕</button>
                `;
                chip.querySelector('button').addEventListener('click', () => {
                    this.state.searchQuery = '';
                    const searchInput = document.getElementById('shop-search-input');
                    if (searchInput) searchInput.value = '';
                    this.updateUrlState();
                    this.applyStateAndRender();
                });
                this.activeFiltersElement.appendChild(chip);
            }

            if (hasFilters) {
                const clearAll = document.createElement('div');
                clearAll.className = 'filter-chip';
                clearAll.style.border = 'none';
                clearAll.style.background = 'transparent';
                clearAll.innerHTML = `<button type="button" style="text-decoration:underline" data-i18n="shop.clear_filters"></button>`;
                clearAll.querySelector('button').addEventListener('click', () => {
                    this.state.categories = [];
                    this.state.searchQuery = '';
                    this.state.priceMin = null;
                    this.state.priceMax = null;
                    
                    document.querySelectorAll('.filter-checkbox input').forEach(cb => cb.checked = false);
                    const searchInput = document.getElementById('shop-search-input');
                    if (searchInput) searchInput.value = '';
                    
                    this.updateUrlState();
                    this.applyStateAndRender();
                });
                this.activeFiltersElement.appendChild(clearAll);
                
                // Need to translate the new "Clear all filters" button
                BambooShop.i18n.applyTranslations();
            }
        },

        applyStateAndRender: function() {
            // 1. Search
            let results = BambooShop.products.search(this.state.searchQuery);
            
            // 2. Filter using searched results (not overriding with getAll())
            if (this.state.categories.length > 0) {
                results = results.filter(p => this.state.categories.includes(p.category));
            }
            if (this.state.priceMin !== null) {
                results = results.filter(p => {
                    const price = p.isOnSale && p.salePrice ? p.salePrice : p.price;
                    return price >= this.state.priceMin;
                });
            }
            if (this.state.priceMax !== null) {
                results = results.filter(p => {
                    const price = p.isOnSale && p.salePrice ? p.salePrice : p.price;
                    return price <= this.state.priceMax;
                });
            }
            if (this.state.inStockOnly) {
                results = results.filter(p => (typeof p.stock !== 'undefined' ? p.stock > 0 : p.isAvailable));
            }

            // 3. Sort
            results = BambooShop.products.sort(results, this.state.sortBy);

            // 4. Update Count
            if (this.countElement) {
                this.countElement.textContent = BambooShop.i18n.t('shop.results', { count: results.length });
            }

            // 5. Active Filters
            this.renderActiveFilters();

            // 6. Pagination
            const totalPages = Math.ceil(results.length / PAGE_SIZE);
            if (this.state.currentPage > totalPages && totalPages > 0) {
                this.state.currentPage = totalPages;
            }
            const startIndex = (this.state.currentPage - 1) * PAGE_SIZE;
            const paginatedResults = results.slice(startIndex, startIndex + PAGE_SIZE);

            // 7. Render grid
            this.renderGrid(paginatedResults);

            // 8. Render pagination controls
            this.renderPagination(totalPages);
        },

        renderGrid: function(products) {
            if (products.length === 0) {
                this.gridElement.style.display = 'none';
                this.emptyStateElement.style.display = 'flex';
                return;
            }

            this.gridElement.style.display = 'grid'; // Reverts to CSS class display rule
            this.emptyStateElement.style.display = 'none';

            let html = '';
            products.forEach((p, index) => {
                // Remove anim-fade-up and add staggered animation classes manually if needed, 
                // but the createProductCardHTML already has anim-fade-up
                html += BambooShop.ui.createProductCardHTML(p);
            });

            this.gridElement.innerHTML = html;
            
            // Apply translations to the newly created cards
            BambooShop.i18n.applyTranslations();

            // Re-trigger scroll observer for new items
            if (BambooShop.animations) {
                BambooShop.animations.observe(this.gridElement.querySelectorAll('.anim-fade-up'));
            }
        },

        renderPagination: function(totalPages) {
            if (!this.paginationElement) return;
            this.paginationElement.innerHTML = '';

            if (totalPages <= 1) return;

            const ul = document.createElement('ul');
            ul.style.display = 'flex';
            ul.style.listStyle = 'none';
            ul.style.gap = 'var(--space-2)';
            ul.style.padding = '0';
            ul.style.justifyContent = 'center';

            for (let i = 1; i <= totalPages; i++) {
                const li = document.createElement('li');
                const btn = document.createElement('button');
                btn.textContent = i;
                btn.className = i === this.state.currentPage ? 'btn btn--primary' : 'btn btn--outline';
                btn.style.minWidth = '44px';
                btn.style.padding = '0';
                
                btn.addEventListener('click', () => {
                    this.state.currentPage = i;
                    this.applyStateAndRender();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
                
                li.appendChild(btn);
                ul.appendChild(li);
            }

            this.paginationElement.appendChild(ul);
        }
    };

    window.BambooShop.shop = shop;
})();
