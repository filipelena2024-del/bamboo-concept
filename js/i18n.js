(function() {
    'use strict';
    window.BambooShop = window.BambooShop || {};

    let currentLang = 'mk';
    let currentCurrency = 'MKD';
    let listeners = [];

    const i18n = {
        init: function() {
            // Load preferred language
            const savedLang = BambooShop.utils.safeLocalStorage.get('bamboo_lang');
            if (savedLang && BambooShop.translations[savedLang]) {
                currentLang = savedLang;
            } else {
                // Try to detect browser language
                const browserLang = navigator.language || navigator.userLanguage;
                if (browserLang.startsWith('mk')) currentLang = 'mk';
                else if (browserLang.startsWith('sq') || browserLang.startsWith('al')) currentLang = 'sq';
                else currentLang = 'en';
            }

            // Load preferred currency
            const savedCurrency = BambooShop.utils.safeLocalStorage.get('bamboo_currency');
            if (savedCurrency && ['MKD', 'EUR'].includes(savedCurrency)) {
                currentCurrency = savedCurrency;
            }

            this.applyTranslations();
            document.documentElement.lang = currentLang;
            
            // Setup listeners for language dropdown
            this.setupLangCurrencyToggles();
        },

        getCurrentLang: function() {
            return currentLang;
        },

        getCurrentCurrency: function() {
            return currentCurrency;
        },

        t: function(key, params = {}) {
            let text = BambooShop.translations[currentLang][key] || 
                       BambooShop.translations['en'][key] || 
                       key;

            if (Object.keys(params).length > 0) {
                for (const [paramKey, paramValue] of Object.entries(params)) {
                    text = text.replace(`{${paramKey}}`, paramValue);
                }
            }
            return text;
        },

        setLanguage: function(lang) {
            if (BambooShop.translations[lang]) {
                currentLang = lang;
                BambooShop.utils.safeLocalStorage.set('bamboo_lang', lang);
                document.documentElement.lang = lang;
                this.applyTranslations();
                this.notifyListeners('lang', lang);
            }
        },

        setCurrency: function(currency) {
            if (['MKD', 'EUR'].includes(currency)) {
                currentCurrency = currency;
                BambooShop.utils.safeLocalStorage.set('bamboo_currency', currency);
                this.applyTranslations(); // Re-apply translations as prices might need update
                this.notifyListeners('currency', currency);
            }
        },

        formatPriceDisplay: function(amountMKD) {
            const converted = BambooShop.utils.convertCurrency(amountMKD, currentCurrency);
            return BambooShop.utils.formatPrice(converted, currentCurrency);
        },

        applyTranslations: function() {
            // Text Content
            BambooShop.utils.$$('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                // Check if it has params stored in data-i18n-params (as JSON string)
                const paramsStr = el.getAttribute('data-i18n-params');
                let params = {};
                if (paramsStr) {
                    try { params = JSON.parse(paramsStr); } catch(e) {}
                }
                
                // Add common params like year
                params.year = new Date().getFullYear();

                el.textContent = this.t(key, params);
            });

            // Placeholders
            BambooShop.utils.$$('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                el.placeholder = this.t(key);
            });

            // Aria Labels
            BambooShop.utils.$$('[data-i18n-aria]').forEach(el => {
                const key = el.getAttribute('data-i18n-aria');
                el.setAttribute('aria-label', this.t(key));
            });

            // Title Attributes
            BambooShop.utils.$$('[data-i18n-title]').forEach(el => {
                const key = el.getAttribute('data-i18n-title');
                el.setAttribute('title', this.t(key));
            });

            // Update language switcher UI
            // Display labels: internal code 'sq' shows as 'AL' (Albanian), not 'SQ' which is offensive
            const LANG_DISPLAY = { mk: 'MK', en: 'EN', sq: 'AL' };
            const currentLangLabel = document.getElementById('current-lang-label');
            if (currentLangLabel) {
                currentLangLabel.textContent = LANG_DISPLAY[currentLang] || currentLang.toUpperCase();
            }

            // Update currency switcher UI
            const currentCurrencyLabel = document.getElementById('current-currency-label');
            if (currentCurrencyLabel) {
                currentCurrencyLabel.textContent = currentCurrency;
            }
        },

        onStateChange: function(callback) {
            listeners.push(callback);
        },

        notifyListeners: function(type, value) {
            listeners.forEach(cb => {
                try {
                    cb(type, value);
                } catch (e) {
                    console.error('Error in i18n listener', e);
                }
            });
        },

        setupLangCurrencyToggles: function() {
            // Cycle Language
            const langs = ['mk', 'en', 'sq'];
            BambooShop.utils.$$('.js-cycle-lang').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    let currentIndex = langs.indexOf(currentLang);
                    let nextIndex = (currentIndex + 1) % langs.length;
                    this.setLanguage(langs[nextIndex]);
                });
            });

            // Cycle Currency
            const currencies = ['MKD', 'EUR'];
            BambooShop.utils.$$('.js-cycle-currency').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    let currentIndex = currencies.indexOf(currentCurrency);
                    let nextIndex = (currentIndex + 1) % currencies.length;
                    this.setCurrency(currencies[nextIndex]);
                });
            });
        }
    };

    window.BambooShop.i18n = i18n;
})();
