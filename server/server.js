const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const Incident = require('./models/Incident');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});
const upload = multer({ storage: storage });

// In-Memory Data
let memoryIncidents = [
    {
        _id: '1',
        type: 'Fire',
        severity: 'High',
        location: { type: 'Point', coordinates: [77.1888, 28.6448], address: 'Karol Bagh, New Delhi' },
        imageUrl: 'assets/fire.png',
        status: 'Assigned',
        assignedTeam: 'Alpha Squad (NDRF Fire Division)',
        createdAt: new Date(Date.now() - 3600000),
        aiAnalysis: mockAIAnalysis('Fire')
    },
    {
        _id: '2',
        type: 'Flood',
        severity: 'Critical',
        location: { type: 'Point', coordinates: [94.2185, 26.9634], address: 'Majuli Island, Assam' },
        imageUrl: 'assets/flood.png',
        status: 'Reported',
        createdAt: new Date(Date.now() - 10800000),
        aiAnalysis: mockAIAnalysis('Flood')
    },
    {
        _id: '3',
        type: 'Landslide',
        severity: 'High',
        location: { type: 'Point', coordinates: [79.5660, 30.5506], address: 'Joshimath Hills, Uttarakhand' },
        imageUrl: 'assets/landslide.png',
        status: 'Reported',
        createdAt: new Date(Date.now() - 86400000),
        aiAnalysis: mockAIAnalysis('Landslide')
    },
    {
        _id: '4',
        type: 'Accident',
        severity: 'Medium',
        location: { type: 'Point', coordinates: [72.8530, 19.1176], address: 'Western Express Highway, Mumbai' },
        imageUrl: 'https://placehold.co/600x400/orange/white?text=Accident+Resolved',
        status: 'Resolved',
        createdAt: new Date(Date.now() - 172800000),
        aiAnalysis: mockAIAnalysis('Accident')
    }
];

let memoryReliefCenters = [
    {
        _id: 'c1',
        name: 'Delhi NCR Evacuation Shelter',
        type: 'Shelter',
        location: { type: 'Point', coordinates: [77.2090, 28.6139], address: 'Chanakyapuri, New Delhi' },
        capacity: 500,
        occupied: 320,
        availability: 'Open'
    },
    {
        _id: 'c2',
        name: 'Assam Civil Disaster Hospital',
        type: 'Hospital',
        location: { type: 'Point', coordinates: [91.7362, 26.1445], address: 'Guwahati, Assam' },
        capacity: 200,
        occupied: 180,
        availability: 'Near Capacity'
    },
    {
        _id: 'c3',
        name: 'Joshimath Alpine Rescue Camp',
        type: 'Camp',
        location: { type: 'Point', coordinates: [79.5660, 30.5506], address: 'Joshimath, Uttarakhand' },
        capacity: 1000,
        occupied: 450,
        availability: 'Open'
    }
];

let memoryEmergencyContacts = [
    { id: '1', name: 'Delhi Fire Service Control', category: 'Fire', phone: '101', region: 'Delhi NCR' },
    { id: '2', name: 'Assam State Emergency Helpline', category: 'Medical', phone: '102', region: 'Assam' },
    { id: '3', name: 'Uttarakhand Mountain Rescue', category: 'Rescue', phone: '108', region: 'Uttarakhand' },
    { id: '4', name: 'National Disaster Response Force (NDRF)', category: 'Rescue', phone: '1078', region: 'All Regions' }
];

let memoryLogs = [
    { timestamp: new Date(Date.now() - 172800000), action: 'Incident Resolved', user: 'Admin', details: 'Accident at Western Express Highway, Mumbai marked as resolved.' },
    { timestamp: new Date(Date.now() - 86400000), action: 'Incident Reported', user: 'Citizen', details: 'Landslide reported at Joshimath Hills, Uttarakhand.' },
    { timestamp: new Date(Date.now() - 10800000), action: 'Incident Reported', user: 'Citizen', details: 'Flood reported at Majuli Island, Assam.' },
    { timestamp: new Date(Date.now() - 3600000), action: 'Team Assigned', user: 'Admin', details: 'Alpha Squad assigned to Fire at Karol Bagh, New Delhi.' }
];

let memoryResourceAllocations = [
    { _id: 'a1', incidentId: '1', incidentType: 'Fire', resourceType: 'Fire Engines', quantity: 2, status: 'Dispatched', updatedAt: new Date() }
];

// Logger Helper
function addLog(action, user, details) {
    memoryLogs.unshift({
        timestamp: new Date(),
        action,
        user,
        details
    });
    // Keep logs under 100 entries
    if (memoryLogs.length > 100) memoryLogs.pop();
}


// MongoDB Connection
const MONGO_URI = 'mongodb://127.0.0.1:27017/disastersense';
let dbConnected = false;

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 })
    .then(async () => {
        console.log('MongoDB Connected Successfully');
        dbConnected = true;
        await seedDatabase();
    })
    .catch(err => {
        console.log('MongoDB Connection Failed (Using In-Memory Fallback):', err.message);
        dbConnected = false;
    });

// Routes

// 1. Get All Incidents
app.get('/api/incidents', async (req, res) => {
    try {
        if (dbConnected) {
            const incidents = await Incident.find().sort({ createdAt: -1 });
            res.json(incidents);
        } else {
            res.json(memoryIncidents);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Report Incident
app.post('/api/report', upload.single('evidence'), async (req, res) => {
    try {
        const { type, description, latitude, longitude, address, severity } = req.body;
        let fileUrl = req.file ? '/uploads/' + req.file.filename : 'https://placehold.co/600x400/gray/white?text=No+Image';

        const newIncidentData = {
            type: type || 'Accident',
            severity: severity || 'Medium',
            description: description,
            location: {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)],
                address: address || 'Unknown Location'
            },
            imageUrl: fileUrl,
            status: 'Reported',
            aiAnalysis: mockAIAnalysis(type || 'Accident')
        };

        if (dbConnected) {
            const newIncident = new Incident(newIncidentData);
            await newIncident.save();
            addLog('Incident Reported', 'Citizen', `${newIncident.type} reported at ${newIncident.location.address}`);
            res.status(201).json(newIncident);
        } else {
            const newIncident = { ...newIncidentData, _id: Date.now().toString(), createdAt: new Date() };
            memoryIncidents.unshift(newIncident);
            addLog('Incident Reported', 'Citizen', `${newIncident.type} reported at ${newIncident.location.address}`);
            res.status(201).json(newIncident);
        }
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 3. Mark as Assigned (New)
app.patch('/api/incidents/:id/assign', async (req, res) => {
    try {
        const { id } = req.params;
        const teamName = "Delta Squad (Auto-Assigned)"; // Simplified logic

        if (dbConnected) {
            const incident = await Incident.findByIdAndUpdate(id, { status: 'Assigned', assignedTeam: teamName }, { new: true });
            addLog('Team Assigned', 'Admin', `${teamName} assigned to ${incident.type} at ${incident.location.address}`);
            res.json(incident);
        } else {
            const incident = memoryIncidents.find(i => i._id === id);
            if (incident) {
                incident.status = 'Assigned';
                incident.assignedTeam = teamName;
                addLog('Team Assigned', 'Admin', `${teamName} assigned to ${incident.type} at ${incident.location.address}`);
                res.json(incident);
            } else {
                res.status(404).json({ error: 'Incident not found' });
            }
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Mark as Resolved
app.patch('/api/incidents/:id/resolve', async (req, res) => {
    try {
        const { id } = req.params;
        if (dbConnected) {
            const incident = await Incident.findByIdAndUpdate(id, { status: 'Resolved' }, { new: true });
            addLog('Incident Resolved', 'Admin', `${incident.type} at ${incident.location.address} marked as resolved.`);
            res.json(incident);
        } else {
            const incident = memoryIncidents.find(i => i._id === id);
            if (incident) {
                incident.status = 'Resolved';
                addLog('Incident Resolved', 'Admin', `${incident.type} at ${incident.location.address} marked as resolved.`);
                res.json(incident);
            } else {
                res.status(404).json({ error: 'Incident not found' });
            }
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Generate Plan
app.post('/api/generate-plan/:id', async (req, res) => {
    try {
        let incident;
        if (dbConnected) {
            incident = await Incident.findById(req.params.id);
        } else {
            incident = memoryIncidents.find(i => i._id === req.params.id);
        }

        if (!incident) return res.status(404).json({ error: 'Incident not found' });

        setTimeout(() => {
            const plan = generateRescueStrategy(incident);
            addLog('Plan Generated', 'AI System', `Rescue plan generated for ${incident.type} in ${incident.location.address}`);
            res.json({ plan });
        }, 1500);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Get Relief Centers
app.get('/api/relief-centers', (req, res) => {
    res.json(memoryReliefCenters);
});

// 7. Get Emergency Contacts
app.get('/api/emergency-contacts', (req, res) => {
    res.json(memoryEmergencyContacts);
});

// 8. Get Logs
app.get('/api/logs', (req, res) => {
    res.json(memoryLogs);
});

// 9. Get Resource Allocations
app.get('/api/resource-allocations', (req, res) => {
    res.json(memoryResourceAllocations);
});

// 10. Post Resource Allocation
app.post('/api/resource-allocations', (req, res) => {
    const { incidentId, incidentType, resourceType, quantity } = req.body;
    const newAllocation = {
        _id: 'a' + Date.now(),
        incidentId,
        incidentType,
        resourceType,
        quantity: parseInt(quantity),
        status: 'Dispatched',
        updatedAt: new Date()
    };
    memoryResourceAllocations.unshift(newAllocation);
    addLog('Resource Dispatched', 'Admin', `Dispatched ${quantity}x ${resourceType} for ${incidentType} (ID: ${incidentId})`);
    res.status(201).json(newAllocation);
});

// 11. Get Dashboard Analytics
app.get('/api/analytics', async (req, res) => {
    try {
        const incidentsList = dbConnected ? await Incident.find() : memoryIncidents;
        const total = incidentsList.length;
        const active = incidentsList.filter(i => i.status !== 'Resolved').length;
        const resolved = incidentsList.filter(i => i.status === 'Resolved').length;
        const teams = incidentsList.filter(i => i.status === 'Assigned').length;

        // Group by type for analytics
        const typeCounts = {};
        incidentsList.forEach(i => {
            typeCounts[i.type] = (typeCounts[i.type] || 0) + 1;
        });

        res.json({
            stats: { total, active, resolved, teams },
            typeCounts,
            recentLogs: memoryLogs.slice(0, 5)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Helpers
async function seedDatabase() {
    try {
        const count = await Incident.countDocuments();
        if (count === 0) {
            const seedData = memoryIncidents.map(({ _id, ...rest }) => rest);
            await Incident.insertMany(seedData);
        }
    } catch (err) { console.error("Seeding error:", err); }
}

function mockAIAnalysis(type) {
    // ... same logic ...
    const responses = {
        'Fire': "Deploy fire suppression drones. Evacuate 500m radius.",
        'Flood': "Deploy amphibious rescue units. Activate high-ground shelters.",
        'Landslide': "Secure perimeter. Deploy geological sensors.",
        'Earthquake': "Assess structural integrity. Search and rescue.",
        'Accident': "Dispatch EMS and traffic control."
    };
    return {
        confidence: 0.95,
        detectedHazards: [type, 'Risk of expansion'],
        suggestedResponse: responses[type] || "Assess immediately."
    };
}

function generateRescueStrategy(incident) {
    return {
        strategy: `**Rescue Plan for ${incident.type}**\n` +
            `1. **Deployment**: Dispatch nearest squad to ${incident.location.address}.\n` +
            `2. **Action**: ${incident.aiAnalysis ? incident.aiAnalysis.suggestedResponse : 'Standard Protocol'}\n` +
            `3. **Status**: ${incident.severity} Level Response Initiated.`
    };
}

app.listen(PORT, () => {
    console.log(`DisasterSense Server running at http://localhost:${PORT}`);
});
