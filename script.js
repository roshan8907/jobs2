const API_BASE = window.location.origin; // Dynamically use the current host (works on PC and Mobile)
// Keep existing jobsData if data.js was loaded, otherwise init empty
if (typeof jobsData === 'undefined') {
    var jobsData = [];
}

// Check for logged in user to update Nav
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileMenu();
    updateNavAuth();

    // Only fetch jobs if we need them (homepage or jobs page)
    if (document.getElementById('jobsGrid') || document.getElementById('allJobsGrid') || window.location.pathname.includes('jobs.html')) {
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
    console.log('Found dropdowns:', dropdowns.length);

    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        if (toggle) {
            console.log('Attaching click handler to dropdown toggle');

            // Handle both click and touch events
            const handleToggle = (e) => {
                console.log('Dropdown clicked, window width:', window.innerWidth);

                // Only prevent default and toggle on mobile
                if (window.innerWidth <= 968) {
                    e.preventDefault();
                    e.stopPropagation();

                    const wasActive = dropdown.classList.contains('active');

                    // Close all dropdowns first
                    dropdowns.forEach(other => {
                        other.classList.remove('active');
                    });

                    // Toggle this dropdown
                    if (!wasActive) {
                        dropdown.classList.add('active');
                        console.log('Dropdown opened');
                    } else {
                        console.log('Dropdown closed');
                    }
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

// ==================== API Fetching ====================
async function fetchAllJobs() {
    try {
        const response = await fetch(`${API_BASE}/api/jobs`);
        if (response.ok) {
            jobsData = await response.json();
        }

        // Data fetched successfully
    } catch (error) {
        console.warn('API Fetch failed, using local data:', error);
        // Fallback: If jobsData is empty after failed fetch, and we have no other source, show error
        if (!jobsData || jobsData.length === 0) {
            const container = document.getElementById('jobsGrid') || document.getElementById('allJobsGrid');
            if (container) container.innerHTML = '<p>Error loading jobs. Please start the server or check your connection.</p>';
            return;
        }
    }

    // Continue with rendering (using either API or local data)
    if (document.getElementById('jobsGrid')) {
        renderJobs(jobsData.slice(0, 6), 'jobsGrid');
        updateJobCounts();
    } else if (window.location.pathname.includes('jobs.html')) {
        initJobsPage();
    }
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
    const visaType = visaTypes[job.country] || 'Work Visa';
    const publishedDate = job.publishedDate || 'Jan 16, 2026';

    return `
        <div class="job-card" data-country="${job.country}" data-job-id="${job.id}">
            <div class="job-card-header">
                <div class="job-logo-wrapper">
                    <img src="${logoUrl}" alt="${job.company}" class="job-logo">
                </div>
                ${isVisa ? `<span class="job-badge">${visaType}</span>` : ''}
            </div>
            <div class="job-card-content">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                    <img src="${countryFlag}" alt="${job.country}" style="width: 24px; height: auto; border-radius: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <h3 class="job-title" style="margin: 0; font-size: 1.25rem;">${job.title}</h3>
                </div>
                <p class="job-company-name">${job.company}</p>
                <div class="job-location">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 1c-3.866 0-7 3.134-7 7 0 5.25 7 11 7 11s7-5.75 7-11c0-3.866-3.134-7-7-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    ${job.location}
                </div>
                <p class="job-description">${preview}</p>
                <div class="job-footer">
                    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                        <span class="job-type">${job.type}</span>
                        <span style="font-size: 0.75rem; color: var(--text-medium);">📅 ${publishedDate}</span>
                    </div>
                    <button class="job-apply-btn" onclick="viewJob(${job.id})">Apply Now</button>
                </div>
            </div>
        </div>
    `;
}

function renderJobs(jobs, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (jobs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No jobs found matching your criteria</h3>
                <p>Try adjusting your search terms or location.</p>
            </div>
        `;
        return;
    }
    container.innerHTML = jobs.map(job => createJobCard(job)).join('');
}

function viewJob(jobId) {
    // Always use job-details.html with ID for local and simple server compatibility
    window.location.href = `job-details.html?id=${jobId}`;
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

        window.location.href = `jobs.html${params.toString() ? '?' + params.toString() : ''}`;
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
function initJobsPage() {
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

    // Initial Filter
    filterAndRenderJobs();

    // Event Listeners
    if (document.getElementById('searchButton')) {
        document.getElementById('searchButton').addEventListener('click', () => filterAndRenderJobs());
    }
}

function filterAndRenderJobs() {
    const keyword = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase() : '';
    const location = document.getElementById('locationFilter') ? document.getElementById('locationFilter').value : '';
    const industry = document.getElementById('industryFilter') ? document.getElementById('industryFilter').value.toLowerCase() : '';

    let results = jobsData;

    // Filter by Keyword
    if (keyword) {
        results = results.filter(job =>
            job.title.toLowerCase().includes(keyword) ||
            job.company.toLowerCase().includes(keyword) ||
            (job.description && job.description.toLowerCase().includes(keyword))
        );
    }

    // Filter by Location
    if (location && location !== 'all') {
        results = results.filter(job => job.country === location);
    }

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

// ==================== Smooth Scroll ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        if (this.getAttribute('href') === '#') return;
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});
