// Keep existing jobsData if data.js was loaded, otherwise init empty
if (typeof jobsData === 'undefined') {
    var jobsData = [];
}

// Check for logged in user to update Nav
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileMenu();
    updateNavAuth();

    // Log to verify initialization
    console.log('Site initialized, checking for job containers...');

    // Load jobs if any relevant container exists
    if (document.getElementById('jobsGrid') || document.getElementById('allJobsGrid')) {
        fetchAllJobs();
    }
});

function updateNavAuth() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const authLink = document.querySelector('nav a[href="login.html"]');
    if (authLink && user) {
        authLink.textContent = 'Dashboard';
        authLink.href = user.role === 'employer' ? 'dashboard-employer.html' : 'dashboard-candidate.html';
    }
}

// ==================== Theme Toggle ====================
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;
    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
}

// ==================== Mobile Menu ====================
function initMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navLinks = document.querySelector('.nav-links');
    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
        });
    }

    // Mobile dropdown toggle - always attach for responsive behavior
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        if (toggle) {
            const handleToggle = (e) => {
                if (window.innerWidth <= 968) {
                    e.preventDefault();
                    e.stopPropagation();
                    const wasActive = dropdown.classList.contains('active');
                    dropdowns.forEach(other => other.classList.remove('active'));
                    if (!wasActive) dropdown.classList.add('active');
                }
            };
            toggle.addEventListener('click', handleToggle);
            toggle.addEventListener('touchstart', handleToggle, { passive: false });
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 968 && !e.target.closest('.dropdown')) {
            dropdowns.forEach(dropdown => dropdown.classList.remove('active'));
        }
    });
}

// Load jobs from local data.js
function fetchAllJobs() {
    // Small delay to ensure data.js is fully parsed
    setTimeout(() => {
        try {
            console.log('fetchAllJobs starting... jobsData type:', typeof jobsData);

            if (typeof jobsData === 'undefined' || !jobsData || jobsData.length === 0) {
                console.error('Job data missing!');
                const container = document.getElementById('jobsGrid') || document.getElementById('allJobsGrid');
                if (container) container.innerHTML = '<p style="text-align:center; padding:2rem;">Error: Job listings could not be loaded. Please refresh the page.</p>';
                return;
            }

            console.log('Jobs loaded:', jobsData.length);

            // Sort jobsData by ID descending to show newest first
            const sortedJobs = [...jobsData].sort((a, b) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0));

            if (document.getElementById('jobsGrid')) {
                renderJobs(sortedJobs.slice(0, 6), 'jobsGrid');
                updateJobCounts();
            } else if (document.getElementById('allJobsGrid')) {
                initJobsPage();
            }
        } catch (error) {
            console.error('Error in fetchAllJobs:', error);
        }
    }, 100);
}

// ==================== Job Rendering ====================
function getInitials(companyName) {
    if (!companyName) return 'CO';
    return companyName.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
}

function createJobCard(job) {
    // Truncate description for preview
    const desc = job.description || '';
    const firstLine = desc.split('\n')[0];
    const preview = firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;
    const isVisa = job.visaSponsorship;
    const logoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(job.company)}&background=random&color=fff&size=128&bold=true`;

    // Country flags mapping (ISO 3166-1 alpha-2)
    const countryFlags = {
        'usa': 'us', 'uk': 'gb', 'canada': 'ca', 'australia': 'au', 'new-zealand': 'nz',
        'germany': 'de', 'france': 'fr', 'netherlands': 'nl', 'switzerland': 'ch',
        'sweden': 'se', 'norway': 'no', 'denmark': 'dk', 'finland': 'fi',
        'belgium': 'be', 'austria': 'at', 'luxembourg': 'lu', 'portugal': 'pt',
        'ireland': 'ie', 'iceland': 'is', 'japan': 'jp', 'south-korea': 'kr', 'singapore': 'sg'
    };

    // Visa types mapping
    const visaTypes = {
        'usa': 'H-1B / EB-3',
        'uk': 'Skilled Worker',
        'canada': 'LMIA / Express Entry',
        'australia': 'TSS 482 / 186',
        'new-zealand': 'Essential Skills',
        'germany': 'EU Blue Card',
        'france': 'Talent Passport',
        'netherlands': 'Highly Skilled Migrant',
        'switzerland': 'L Permit',
        'sweden': 'Work Permit',
        'norway': 'Skilled Worker',
        'denmark': 'Pay Limit Scheme',
        'finland': 'Specialist Visa',
        'belgium': 'Single Permit',
        'austria': 'Red-White-Red Card',
        'luxembourg': 'EU Blue Card',
        'portugal': 'Work Visa',
        'ireland': 'Critical Skills',
        'iceland': 'Work Permit',
        'japan': 'Engineer Visa',
        'south-korea': 'E-7 Visa',
        'singapore': 'Employment Pass'
    };

    const flagCode = countryFlags[job.country] || 'un';
    const countryFlag = `https://flagcdn.com/w40/${flagCode}.png`;

    // Standardize Visa Text: H-1B / EB-3 for USA, 'Visa Sponsorship' for others
    const visaType = job.country === 'usa' ? 'H-1B / EB-3' : 'Visa Sponsorship';

    const publishedDate = job.publishedDate || 'Jan 19, 2026';

    // Only show logo if it's not a placeholder (not ui-avatars.com)
    const hasRealLogo = job.image && !job.image.includes('ui-avatars.com');

    return `
        <div class="job-card" data-country="${job.country}" data-job-id="${job.id}">
            <div class="job-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <div class="header-left" style="display: flex; align-items: center; gap: 0.75rem;">
                    ${hasRealLogo ? `
                        <div class="job-logo-wrapper" style="width: 48px; height: 48px; flex-shrink: 0;">
                            <img src="${job.image}" alt="${job.company}" class="job-logo" style="width: 100%; height: 100%; object-fit: contain;">
                        </div>
                    ` : `
                        <div class="flag-wrapper" style="width: 40px; height: auto; border-radius: 4px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <img src="${countryFlag}" alt="${job.country}" style="width: 100%; display: block;">
                        </div>
                    `}
                </div>
                ${isVisa ? `<span class="job-badge" style="background: var(--primary-light); color: var(--primary-color); padding: 0.4rem 0.8rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 600;">${visaType}</span>` : ''}
            </div>
            
            <div class="job-card-content">
                <h3 class="job-title" style="margin: 0 0 0.25rem 0; font-size: 1.25rem; font-weight: 700; color: var(--text-dark);">${job.title}</h3>
                <p class="job-company-name" style="margin-bottom: 1rem; color: var(--text-medium); font-weight: 500;">${job.company}</p>
                
                <div class="job-info-meta" style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem;">
                    <div class="job-location" style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-medium); font-size: 0.9rem;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        ${job.location}
                    </div>
                    <div class="job-type" style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-medium); font-size: 0.9rem;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                        ${job.type}
                    </div>
                </div>

                <div class="job-pills" style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                    <span style="background: #eef2ff; color: #4f46e5; padding: 0.35rem 0.75rem; border-radius: 99px; font-size: 0.8rem; font-weight: 600;">${job.industry || 'General'}</span>
                    ${isVisa ? `<span style="background: var(--bg-mint); color: var(--primary-dark); padding: 0.35rem 0.75rem; border-radius: 99px; font-size: 0.8rem; font-weight: 600;">Visa Sponsored</span>` : ''}
                </div>

                <div class="job-footer" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                    <span style="font-size: 0.8rem; color: var(--text-light);">📅 ${publishedDate}</span>
                    <button class="job-apply-btn" onclick="viewJob(${job.id})" style="background: var(--primary-color); color: white; border: none; padding: 0.6rem 1.2rem; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; transition: all var(--transition-base);">Apply Now</button>
                </div>
            </div>
        </div>
    `;
}

function renderJobs(jobs, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Reset container with a quick fade-out effect for smoothness
    container.style.opacity = '0';

    setTimeout(() => {
        if (jobs.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="animation: fadeIn 0.5s ease-out;">
                    <h3>No jobs found matching your criteria</h3>
                    <p>Try adjusting your search terms or location.</p>
                </div>
            `;
        } else {
            container.innerHTML = jobs.map((job, index) => {
                const cardHtml = createJobCard(job);
                // Wrap in a div to apply staggered animation
                return `<div style="animation: slideUp 0.5s ease-out ${index * 0.05}s both;">${cardHtml}</div>`;
            }).join('');
        }
        container.style.opacity = '1';
        container.style.transition = 'opacity 0.3s ease';

        // Initialize reveal on scroll for newly added items
        initScrollReveal();
    }, 50);
}

function viewJob(jobId) {
    // Always use job-details.html with ID for local and simple server compatibility
    window.location.href = `/job-details?id=${jobId}`;
}

// ==================== Homepage Filters ====================
// Country Tabs on Homepage
document.querySelectorAll('.country-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.country-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const country = tab.dataset.country;
        const filtered = country === 'all'
            ? jobsData
            : jobsData.filter(j => j.country === country);

        // Update Header Text Dynamically
        const oppTitle = document.getElementById('oppTitle');
        const oppSubtitle = document.getElementById('oppSubtitle');
        if (oppTitle && oppSubtitle) {
            if (country && country !== 'all') {
                const countryDisplay = {
                    'usa': 'United States',
                    'uk': 'United Kingdom',
                    'uae': 'United Arab Emirates',
                    'new-zealand': 'New Zealand',
                    'south-korea': 'South Korea'
                };
                const countryName = countryDisplay[country] || country.charAt(0).toUpperCase() + country.slice(1).replace(/-/g, ' ');
                oppTitle.textContent = `Find Visa Sponsorship Jobs in ${countryName}`;
            } else {
                oppTitle.textContent = 'Latest Opportunities';
            }
            oppSubtitle.textContent = 'Explore opportunities across New Zealand, Australia, Canada, and the United States,';
        }

        renderJobs(filtered.slice(0, 6), 'jobsGrid');
    });
});

function updateJobCounts() {
    const countElements = document.querySelectorAll('.job-count');
    countElements.forEach(element => {
        const country = element.dataset.country;
        const count = jobsData.filter(job => job.country === country).length;
        element.textContent = `${count} open position${count !== 1 ? 's' : ''}`;
    });
}

// Hero Search
const heroSearchBtn = document.getElementById('heroSearchBtn');
if (heroSearchBtn) {
    heroSearchBtn.addEventListener('click', () => {
        const keyword = document.getElementById('heroSearch').value;
        const industry = document.getElementById('heroIndustry').value;
        const location = document.getElementById('heroLocation').value;

        const params = new URLSearchParams();
        if (keyword) params.append('q', keyword);
        if (industry) params.append('industry', industry);
        if (location && location !== 'all') params.append('country', location);

        window.location.href = '/jobs' + (params.toString() ? '?' + params.toString() : '');
    });
}

// Hero Pills Logic
const heroPills = document.querySelectorAll('.hero-pill');
if (heroPills.length > 0) {
    heroPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const country = pill.dataset.country;
            const heroLoc = document.getElementById('heroLocation');
            const jobLoc = document.getElementById('locationFilter');
            const heroBtn = document.getElementById('heroSearchBtn');
            const jobBtn = document.getElementById('searchButton');

            // Update active pill
            heroPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            // Handle Home Page
            if (heroLoc && heroBtn) {
                heroLoc.value = (country === 'all' || country === '') ? '' : country;
                heroBtn.click();
            }
            // Handle Jobs Page
            else if (jobLoc && jobBtn) {
                jobLoc.value = (country === 'all' || country === '') ? '' : country;
                jobBtn.click();
            }
        });
    });
}

// ==================== Jobs Page Logic ====================
function initJobsPage(data) {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q') || '';
    const c = urlParams.get('country') || '';
    const ind = urlParams.get('industry') || '';

    const searchInput = document.getElementById('searchInput');
    const locationFilter = document.getElementById('locationFilter');
    const industryFilter = document.getElementById('industryFilter');

    if (searchInput) searchInput.value = q;
    if (locationFilter) locationFilter.value = c;
    if (industryFilter) industryFilter.value = ind;

    // Highlight active pill if on jobs page
    if (c) {
        const pills = document.querySelectorAll('.hero-pill');
        pills.forEach(p => {
            p.classList.remove('active');
            if (p.dataset.country === c) p.classList.add('active');
        });
    } else {
        // Default to 'All Countries' pill if no country param
        const allPill = document.querySelector('.hero-pill[data-country=""], .hero-pill[data-country="all"]');
        if (allPill) {
            document.querySelectorAll('.hero-pill').forEach(p => p.classList.remove('active'));
            allPill.classList.add('active');
        }
    }

    // Initial Filter
    filterAndRenderJobs();

    // Event Listeners
    if (document.getElementById('searchButton')) {
        document.getElementById('searchButton').addEventListener('click', () => filterAndRenderJobs());
    }
}

// Add listener to handle URL changes if user clicks a country link while already on jobs.html
window.addEventListener('popstate', () => {
    if (document.getElementById('allJobsGrid')) {
        initJobsPage();
    }
});

function filterAndRenderJobs() {
    const keyword = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase() : '';
    const location = document.getElementById('locationFilter') ? document.getElementById('locationFilter').value : '';
    const industry = document.getElementById('industryFilter') ? document.getElementById('industryFilter').value.toLowerCase() : '';

    // Update Header Text Dynamically
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    if (pageTitle && pageSubtitle) {
        if (location && location !== '' && location !== 'all') {
            const countryDisplay = {
                'usa': 'United States',
                'uk': 'United Kingdom',
                'uae': 'United Arab Emirates',
                'new-zealand': 'New Zealand',
                'south-korea': 'South Korea'
            };
            const countryName = countryDisplay[location] || location.charAt(0).toUpperCase() + location.slice(1).replace(/-/g, ' ');
            pageTitle.textContent = `Find Visa Sponsorship Jobs in ${countryName}`;
        } else {
            pageTitle.textContent = 'Browse All Jobs';
        }
        pageSubtitle.textContent = 'Explore opportunities across New Zealand, Australia, Canada, and the United States,';
    }

    let results = jobsData;

    // Filter by Keyword
    if (keyword) {
        results = results.filter(job =>
            job.title.toLowerCase().includes(keyword) ||
            job.company.toLowerCase().includes(keyword) ||
            (job.description && job.description.toLowerCase().includes(keyword))
        );
    }//

    // Filter by Location
    if (location && location !== 'all') {
        results = results.filter(job => job.country === location);
    } //
    // Filter by Industry
    if (industry) {
        results = results.filter(job => {
            const jobIndustry = (job.industry || "").toLowerCase();
            return jobIndustry === industry ||
                job.title.toLowerCase().includes(industry) ||
                (job.description && job.description.toLowerCase().includes(industry));
        });
    }

    renderJobs(results, 'allJobsGrid');
}

// ==================== Scroll Reveal ====================
function initScrollReveal() {
    const options = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, options);

    // Apply to sections and cards that aren't already animated by the grid logic
    document.querySelectorAll('.section-header, .industry-card, .seo-article-card, .country-card, .footer-section').forEach(el => {
        if (!el.classList.contains('revealed')) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
            observer.observe(el);
        }
    });
}

// Custom reveal implementation via CSS class
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .revealed {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    </style>
`);

// Call on load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initScrollReveal, 100);
});

// ==================== Smooth Scroll ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        if (this.getAttribute('href') === '#') return;
        const href = this.getAttribute('href');
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});
// ==================== All Ads Initialization ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing all ads...');

    // ==================== Ad Script Logic ====================
    function loadAdScript() {
        console.log('Loading ad script...');
        const script = document.createElement('script');
        script.src = 'https://anniversaryvacuumambassador.com/7e/27/34/7e2734d6c8c594242768e1c8d15cdc39.js';
        script.async = true;
        document.body.appendChild(script);
    }

    // Initial load
    loadAdScript();

    // Repeat once after 20 seconds
    setTimeout(() => {
        loadAdScript();
    }, 20000);

    // ==================== Social Banner ad logic ====================
    function loadSocialBanner() {
        console.log('Loading social banner...');
        const script = document.createElement('script');
        script.src = 'https://anniversaryvacuumambassador.com/6a/a0/9d/6aa09ddeea2852277be560c865e73bb5.js';
        script.async = true;
        document.body.appendChild(script);
    }

    // Initial load
    loadSocialBanner();

    // Repeat once after 10 seconds
    setTimeout(() => {
        loadSocialBanner();
    }, 10000);

    // ==================== Sticky Banner Ad Logic ====================
    function initStickyAd() {
        console.log('Initializing sticky ad...');
        const adContainer = document.createElement('div');
        adContainer.className = 'sticky-ad-container';
        adContainer.id = 'stickyAdContainer';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'sticky-ad-close';
        closeBtn.innerHTML = 'AD <i class="fas fa-chevron-down"></i>';
        closeBtn.onclick = () => {
            adContainer.classList.toggle('minimized');
        };

        const adContent = document.createElement('div');
        adContent.id = 'container-2eaab9c485f882915795c216365f0139';

        adContainer.appendChild(closeBtn);
        adContainer.appendChild(adContent);
        document.body.appendChild(adContainer);

        // Set options
        window.atOptions = {
            'key': '2eaab9c485f882915795c216365f0139',
            'format': 'iframe',
            'height': 90,
            'width': 728,
            'params': {}
        };

        // Load invoke script
        const script = document.createElement('script');
        script.src = 'https://anniversaryvacuumambassador.com/2eaab9c485f882915795c216365f0139/invoke.js';
        script.async = true;
        document.body.appendChild(script);

        // Slide up after 2 seconds
        setTimeout(() => {
            adContainer.classList.add('active');
        }, 2000);
    }

    // Start sticky ad
    initStickyAd();
});
