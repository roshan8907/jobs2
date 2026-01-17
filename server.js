const express = require('express');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'supersecretkey_change_in_production';

// SEO Friendly Route for Job Details
app.get('/:country/:slug', (req, res, next) => {
    // Check if it's a static file request or API
    if (req.params.country === 'api' || req.params.country === 'uploads' || req.params.slug.includes('.')) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'job-details.html'));
});

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disabled for prototype to allow external Unsplash/FontAwesome images
}));
app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static Files - serve the current directory
app.use(express.static(path.join(__dirname)));
// Create uploads directory if not exists
const fs = require('fs');
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}
app.use('/uploads', express.static('uploads'));

// Multer Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, role, companyName, companyDescription } = req.body;

    if (db.findUserByEmail(email)) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
        id: Date.now(),
        name,
        email,
        password: hashedPassword,
        role: role || 'candidate', // 'candidate' or 'employer'
        companyName: role === 'employer' ? companyName : null,
        companyDescription: role === 'employer' ? companyDescription : null,
        skills: [],
        experience: ''
    };

    db.saveUser(user);
    res.status(201).json({ message: 'User registered successfully' });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = db.findUserByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, SECRET_KEY, { expiresIn: '24h' });

    // Return user info excluding password
    const { password: _, ...userInfo } = user;
    res.json({ token, user: userInfo });
});

// --- Job Routes ---
app.get('/api/jobs', (req, res) => {
    const { q, country, id } = req.query;
    let jobs = db.getJobs();

    if (id) {
        jobs = jobs.filter(j => j.id == id);
    }

    if (q) {
        const searchTerm = q.toLowerCase();
        jobs = jobs.filter(j =>
            j.title.toLowerCase().includes(searchTerm) ||
            j.company.toLowerCase().includes(searchTerm) ||
            (j.description && j.description.toLowerCase().includes(searchTerm))
        );
    }

    if (country && country !== 'all') {
        jobs = jobs.filter(j => j.country === country);
    }

    res.json(jobs);
});

app.get('/api/jobs/:id', (req, res) => {
    const job = db.getJobById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
});

// Protected: Post Job (Employer only)
app.post('/api/jobs', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid token" });
        if (user.role !== 'employer') return res.status(403).json({ message: "Only employers can post jobs" });

        const job = req.body;
        // Default image if not provided
        if (!job.image) job.image = "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80";

        job.postedBy = user.id; // Link job to employer
        job.company = user.companyName || job.company; // Use profile company name preferably

        const savedJob = db.saveJob(job);
        res.status(201).json(savedJob);
    });
});

// --- Application Routes ---
app.post('/api/apply', upload.fields([
    { name: 'cv', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 },
    { name: 'documents', maxCount: 3 }
]), (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Please login to apply' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid token" });

        const { jobId, message } = req.body;

        const application = {
            jobId: parseInt(jobId),
            userId: user.id,
            applicantName: user.name,
            applicantEmail: user.email,
            message,
            cvPath: req.files['cv'] ? req.files['cv'][0].path : null,
            coverLetterPath: req.files['coverLetter'] ? req.files['coverLetter'][0].path : null,
            otherDocsPaths: req.files['documents'] ? req.files['documents'].map(f => f.path) : []
        };

        db.saveApplication(application);
        res.status(201).json({ message: 'Application submitted successfully' });
    });
});

// --- Dashboard Routes ---
app.get('/api/dashboard/candidate', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid token" });

        const allApplications = db.getApplications();
        const myApplications = allApplications.filter(app => app.userId === user.id);

        // Enrich with job details
        const enriched = myApplications.map(app => {
            const job = db.getJobById(app.jobId);
            const defaultImage = 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';

            return {
                ...app,
                jobTitle: job ? job.title : 'Unknown Job',
                company: (job && job.company) ? job.company : 'Confidential',
                jobImage: (job && job.image) ? job.image : defaultImage,
                country: job ? job.country : 'usa' // Fallback to usa for display
            };
        });

        res.json({ applications: enriched, user });
    });
});

app.get('/api/dashboard/employer', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid token" });
        if (user.role !== 'employer') return res.status(403).json({ message: "Access denied" });

        const jobs = db.getJobs().filter(j => j.postedBy === user.id);
        // For prototype, we might not have postedBy on initial data. 
        // We will just show all jobs if user matches "company" name or if they posted it.
        // For simplicity in this step, let's just return jobs posted by this user.

        const myJobs = jobs.map(job => {
            // Use loose equality to handle potential string/number mismatches in IDs
            const apps = db.getApplications().filter(a => a.jobId == job.id);
            return { ...job, applicantCount: apps.length, applicants: apps };
        });

        res.json({ jobs: myJobs, user });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at:`);
    console.log(`- Local: http://localhost:${PORT}`);
    console.log(`- Network: http://192.168.8.66:${PORT}`);
    console.log(`\nAccess from mobile device using: http://192.168.8.66:${PORT}`);
});
