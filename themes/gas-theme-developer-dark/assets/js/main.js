/**
 * GAS Developer Theme JavaScript
 */
(function($) {
    'use strict';
    
    // Header scroll effect
    function handleHeaderScroll() {
        const header = document.querySelector('.developer-header');
        if (!header) return;
        
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }
    
    // Mobile menu toggle
    function initMobileMenu() {
        const toggle = document.querySelector('.developer-menu-toggle');
        if (!toggle) return;
        
        // Collect all nav elements
        const allNavs = document.querySelectorAll('.developer-nav, .developer-nav-left, .developer-nav-right, .developer-nav-stacked');
        if (allNavs.length === 0) return;
        
        // Create a single mobile menu container
        let mobileMenu = document.querySelector('.developer-mobile-menu');
        if (!mobileMenu) {
            mobileMenu = document.createElement('div');
            mobileMenu.className = 'developer-mobile-menu';
            
            // Clone all nav items into mobile menu (preserving structure for dropdowns)
            allNavs.forEach(nav => {
                // Get direct children (links and dropdowns)
                const items = nav.querySelectorAll(':scope > a, :scope > .developer-nav-dropdown, :scope > .developer-lang-switcher');
                items.forEach(item => {
                    const clone = item.cloneNode(true);
                    mobileMenu.appendChild(clone);
                });
            });
            
            // Insert after header
            const header = document.querySelector('.developer-header');
            if (header) {
                header.after(mobileMenu);
            }
        }
        
        toggle.addEventListener('click', function() {
            mobileMenu.classList.toggle('active');
            toggle.classList.toggle('active');
        });
        
        // Handle dropdown toggles on mobile
        mobileMenu.querySelectorAll('.developer-nav-dropdown > .developer-nav-parent').forEach(parentLink => {
            parentLink.addEventListener('click', function(e) {
                // Only toggle on mobile
                if (window.innerWidth <= 968) {
                    e.preventDefault();
                    const dropdown = this.closest('.developer-nav-dropdown');
                    dropdown.classList.toggle('open');
                }
            });
        });
        
        // Close menu when clicking a non-dropdown link
        mobileMenu.querySelectorAll('a:not(.developer-nav-parent)').forEach(link => {
            link.addEventListener('click', function() {
                mobileMenu.classList.remove('active');
                toggle.classList.remove('active');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!mobileMenu.contains(e.target) && !toggle.contains(e.target)) {
                mobileMenu.classList.remove('active');
                toggle.classList.remove('active');
            }
        });
    }
    
    // Smooth scroll for anchor links
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
    
    // Animate elements on scroll
    function initScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        document.querySelectorAll('.developer-section-header, .developer-about, .developer-testimonial-card, .developer-attraction-card').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    }
    
    // Add animation class styles
    function addAnimationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .animate-in {
                opacity: 1 !important;
                transform: translateY(0) !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', function() {
        handleHeaderScroll();
        initMobileMenu();
        initSmoothScroll();
        addAnimationStyles();
        initScrollAnimations();
        
        // Scroll handler
        window.addEventListener('scroll', handleHeaderScroll);
        
        // Fix: Remove inline padding-top from gas-rooms-page-wrapper on Book Now page
        if (document.body.classList.contains('page-template-template-book-now')) {
            var wrapper = document.querySelector('.gas-rooms-page-wrapper');
            if (wrapper) {
                wrapper.style.paddingTop = '20px';
            }
        }
    });
    
})(jQuery);

// Hero Slider
document.addEventListener('DOMContentLoaded', function() {
    const heroSection = document.querySelector('.developer-hero[data-slider-duration]');
    if (!heroSection) return;
    
    const slides = heroSection.querySelectorAll('.developer-hero-slide');
    if (slides.length < 2) return;
    
    const duration = parseInt(heroSection.dataset.sliderDuration) || 5000;
    const transition = heroSection.dataset.sliderTransition || 'fade';
    let currentIndex = 0;
    
    function nextSlide() {
        const prevIndex = currentIndex;
        slides[currentIndex].classList.remove('active');
        if (transition === 'slide') {
            slides[currentIndex].classList.add('prev');
        }
        
        currentIndex = (currentIndex + 1) % slides.length;
        slides[currentIndex].classList.add('active');
        
        // Remove prev class after transition
        if (transition === 'slide') {
            setTimeout(() => {
                slides[prevIndex].classList.remove('prev');
            }, 800);
        }
    }
    
    // Start the slider
    setInterval(nextSlide, duration);
});
