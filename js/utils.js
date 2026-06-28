(function() {
    'use strict';
    window.BambooShop = window.BambooShop || {};

    const utils = {
        sanitizeHTML: function(str) {
            if (!str) return '';
            const temp = document.createElement('div');
            temp.textContent = str;
            return temp.innerHTML;
        },

        debounce: function(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        throttle: function(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        formatPrice: function(amount, currency) {
            if (typeof amount !== 'number') return '';
            if (currency === 'EUR') {
                return '€' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            } else {
                return amount.toLocaleString('mk-MK') + ' ден';
            }
        },

        convertCurrency: function(amountMKD, toCurrency) {
            const RATE = 61.5;
            if (toCurrency === 'EUR') {
                return amountMKD / RATE;
            }
            return amountMKD;
        },

        generateId: function() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        },

        slugify: function(text) {
            return text.toString().toLowerCase()
                .replace(/\s+/g, '-')           // Replace spaces with -
                .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
                .replace(/\-\-+/g, '-')         // Replace multiple - with single -
                .replace(/^-+/, '')             // Trim - from start of text
                .replace(/-+$/, '');            // Trim - from end of text
        },

        getQueryParam: function(name) {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(name);
        },

        setQueryParam: function(name, value) {
            const url = new URL(window.location);
            if (value) {
                url.searchParams.set(name, value);
            } else {
                url.searchParams.delete(name);
            }
            window.history.pushState({}, '', url);
        },

        validateEmail: function(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(String(email).toLowerCase());
        },

        validatePhone: function(phone) {
            const re = /^(\+389|0)[0-9]{8}$/;
            // simple validation, allow some spaces or dashes
            const cleaned = phone.replace(/[\s-]/g, '');
            return re.test(cleaned);
        },

        safeLocalStorage: {
            get: function(key) {
                try {
                    const item = localStorage.getItem(key);
                    return item ? JSON.parse(item) : null;
                } catch (e) {
                    console.error('Error reading from localStorage', e);
                    return null;
                }
            },
            set: function(key, value) {
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                    return true;
                } catch (e) {
                    console.error('Error writing to localStorage (Quota exceeded?)', e);
                    return false;
                }
            },
            remove: function(key) {
                try {
                    localStorage.removeItem(key);
                } catch(e) {
                    console.error('Error removing from localStorage', e);
                }
            }
        },

        createElement: function(tag, className, innerHTML = '') {
            const el = document.createElement(tag);
            if (className) el.className = className;
            if (innerHTML) el.innerHTML = innerHTML; // Be careful, only pass trusted/sanitized HTML here
            return el;
        },

        $: function(selector, context = document) {
            return context.querySelector(selector);
        },

        $$: function(selector, context = document) {
            return Array.from(context.querySelectorAll(selector));
        }
    };

    window.BambooShop.utils = utils;
})();
