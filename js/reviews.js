(function() {
    'use strict';
    window.BambooShop = window.BambooShop || {};

    // Basic review system stored in localStorage
    const STORAGE_KEY = 'bamboo_reviews';

    const reviews = {
        getAll: function() {
            return BambooShop.utils.safeLocalStorage.get(STORAGE_KEY) || [];
        },

        getByProductId: function(productId) {
            const all = this.getAll();
            return all.filter(r => r.productId === productId);
        },

        getApprovedByProductId: function(productId) {
            return this.getByProductId(productId).filter(r => r.isApproved);
        },

        add: function(reviewData) {
            const all = this.getAll();
            const review = {
                ...reviewData,
                id: BambooShop.utils.generateId(),
                createdAt: Date.now(),
                isApproved: false // Admin must approve
            };
            all.push(review);
            BambooShop.utils.safeLocalStorage.set(STORAGE_KEY, all);
            return review;
        },

        approve: function(id) {
            const all = this.getAll();
            const review = all.find(r => r.id === id);
            if (review) {
                review.isApproved = true;
                BambooShop.utils.safeLocalStorage.set(STORAGE_KEY, all);
            }
        },

        remove: function(id) {
            const all = this.getAll();
            const filtered = all.filter(r => r.id !== id);
            BambooShop.utils.safeLocalStorage.set(STORAGE_KEY, filtered);
        },

        getAverageRating: function(productId) {
            const approved = this.getApprovedByProductId(productId);
            if (approved.length === 0) return 0;
            const sum = approved.reduce((acc, r) => acc + r.rating, 0);
            return (sum / approved.length).toFixed(1);
        },

        renderStars: function(rating, interactive = false) {
            let html = `<div class="rating ${interactive ? 'rating--input' : ''}">`;
            for (let i = 1; i <= 5; i++) {
                const filledClass = i <= rating ? 'rating__star--filled' : '';
                html += `
                    <svg class="rating__star ${filledClass}" viewBox="0 0 24 24" ${interactive ? `data-val="${i}"` : ''}>
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                    </svg>
                `;
            }
            html += `</div>`;
            return html;
        }
    };

    window.BambooShop.reviews = reviews;
})();
