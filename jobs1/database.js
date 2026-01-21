const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'db.json');

// Helper to read DB
const readDb = () => {
    if (!fs.existsSync(dbPath)) {
        const initialData = { users: [], jobs: [], applications: [] };
        fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
        return initialData;
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
};

// Helper to write DB
const writeDb = (data) => {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

module.exports = {
    getUsers: () => readDb().users,
    saveUser: (user) => {
        const data = readDb();
        data.users.push(user);
        writeDb(data);
        return user;
    },
    findUserByEmail: (email) => {
        const data = readDb();
        return data.users.find(u => u.email === email);
    },
    getJobs: () => readDb().jobs,
    getJobById: (id) => {
        const data = readDb();
        return data.jobs.find(j => j.id == id);
    },
    saveJob: (job) => {
        const data = readDb();
        // Generate new ID if not present
        if (!job.id) {
            const maxId = data.jobs.reduce((max, j) => Math.max(max, j.id), 0);
            job.id = maxId + 1;
        }
        data.jobs.push(job);
        writeDb(data);
        return job;
    },
    getApplications: () => readDb().applications,
    saveApplication: (application) => {
        const data = readDb();
        application.id = Date.now();
        application.submittedAt = new Date().toISOString();
        data.applications.push(application);
        writeDb(data);
        return application;
    }
};
