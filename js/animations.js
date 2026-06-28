(function() {
    'use strict';
    window.BambooShop = window.BambooShop || {};

    const animations = {
        init: function() {
            // Check for user preference
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            
            if (prefersReducedMotion) {
                // If user prefers reduced motion, just show everything immediately
                document.querySelectorAll('.anim-fade-in, .anim-fade-up, .anim-fade-left, .anim-fade-right, .anim-scale-in, .anim-stagger').forEach(el => {
                    el.classList.add('anim--visible');
                });
                return;
            }

            // Setup Intersection Observer for scroll animations
            const observerOptions = {
                root: null,
                rootMargin: '0px 0px -10% 0px', // Trigger slightly before it comes fully into view
                threshold: 0.15
            };

            const observerCallback = (entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Add class to trigger animation
                        entry.target.classList.add('anim--visible');
                        
                        // Stop observing once animated
                        observer.unobserve(entry.target);
                    }
                });
            };

            this.observer = new IntersectionObserver(observerCallback, observerOptions);

            // Select elements to animate
            const elementsToAnimate = document.querySelectorAll('.anim-fade-in, .anim-fade-up, .anim-fade-left, .anim-fade-right, .anim-scale-in, .anim-stagger');
            
            elementsToAnimate.forEach(el => {
                this.observer.observe(el);
            });

            // Setup Parallax if any
            this.setupParallax();
        },

        setupParallax: function() {
            const parallaxElements = document.querySelectorAll('.parallax');
            if (parallaxElements.length === 0) return;

            let ticking = false;

            const onScroll = () => {
                if (!ticking) {
                    window.requestAnimationFrame(() => {
                        const scrollY = window.scrollY;
                        
                        parallaxElements.forEach(el => {
                            const speed = parseFloat(el.getAttribute('data-parallax-speed')) || 0.3;
                            // Only animate if element is somewhat in viewport (simplified check)
                            const rect = el.getBoundingClientRect();
                            if (rect.top < window.innerHeight && rect.bottom > 0) {
                                // Calculate offset relative to the element's position on screen
                                const yPos = -(rect.top * speed);
                                el.style.transform = `translate3d(0, ${yPos}px, 0)`;
                            }
                        });
                        
                        ticking = false;
                    });
                    ticking = true;
                }
            };

            window.addEventListener('scroll', onScroll, { passive: true });
        },

        // Helper to manually trigger animations (e.g. for dynamically loaded content)
        observe: function(elements) {
            if (!this.observer) return;
            
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            
            if (elements instanceof NodeList || Array.isArray(elements)) {
                elements.forEach(el => {
                    if (prefersReducedMotion) {
                        el.classList.add('anim--visible');
                    } else {
                        this.observer.observe(el);
                    }
                });
            } else if (elements) {
                if (prefersReducedMotion) {
                    elements.classList.add('anim--visible');
                } else {
                    this.observer.observe(elements);
                }
            }
        }
    };

    window.BambooShop.animations = animations;
})();
