const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['Fire', 'Flood', 'Landslide', 'Earthquake', 'Accident']
    },
    severity: {
        type: String,
        required: true,
        enum: ['Low', 'Medium', 'High', 'Critical']
    },
    description: String,
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        },
        address: String
    },
    imageUrl: String,
    status: {
        type: String,
        default: 'Reported', // Reported, Assigned, Resolved
        enum: ['Reported', 'Assigned', 'Resolved']
    },
    assignedTeam: {
        type: String,
        default: null
    },
    aiAnalysis: {
        confidence: Number,
        detectedHazards: [String],
        suggestedResponse: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create Geospatial Index
IncidentSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Incident', IncidentSchema);
