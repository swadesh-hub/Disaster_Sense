/**
 * DisasterSense Frontend Logic
 * Upgraded to support: Advanced Navigation, Dual-Interface (Citizen & Admin),
 * Leaflet Maps API, Chart.js Analytics, Resource Allocation, and live audit logs.
 */

// ============================================
// OFFLINE & NETLIFY LOCALSTORAGE MOCK SYSTEM
// ============================================
const originalFetch = window.fetch;
window.fetch = async function (url, options) {
    const isApiCall = url.toString().startsWith('/api');
    if (!isApiCall) {
        return originalFetch(url, options);
    }

    const isDemoMode = window.location.hostname.includes('netlify') || window.location.hostname.includes('github.io');
    if (!isDemoMode) {
        try {
            const res = await originalFetch(url, options);
            if (res.ok || res.status < 500) {
                return res;
            }
        } catch (e) {
            console.log("Backend offline, switching to LocalStorage mock mode.");
        }
    }

    return handleMockApi(url, options);
};

function handleMockApi(url, options) {
    const path = url.toString().replace('/api/', '');
    const method = (options && options.method) ? options.method.toUpperCase() : 'GET';

    const getDB = (key, defaultVal) => {
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, JSON.stringify(defaultVal));
        }
        return JSON.parse(localStorage.getItem(key));
    };
    const setDB = (key, val) => localStorage.setItem(key, JSON.stringify(val));

    const defaultIncidents = [
        { _id: '1', type: 'Fire', severity: 'High', location: { coordinates: [77.1888, 28.6448], address: 'Karol Bagh, New Delhi' }, imageUrl: 'assets/fire.png', status: 'Assigned', assignedTeam: 'Alpha Squad (NDRF Fire Division)', createdAt: new Date(Date.now() - 3600000).toISOString() },
        { _id: '2', type: 'Flood', severity: 'Critical', location: { coordinates: [94.2185, 26.9634], address: 'Majuli Island, Assam' }, imageUrl: 'assets/flood.png', status: 'Reported', createdAt: new Date(Date.now() - 10800000).toISOString() },
        { _id: '3', type: 'Landslide', severity: 'High', location: { coordinates: [79.5660, 30.5506], address: 'Joshimath Hills, Uttarakhand' }, imageUrl: 'assets/landslide.png', status: 'Reported', createdAt: new Date(Date.now() - 86400000).toISOString() },
        { _id: '4', type: 'Accident', severity: 'Medium', location: { coordinates: [72.8530, 19.1176], address: 'Western Express Highway, Mumbai' }, imageUrl: 'https://placehold.co/600x400/orange/white?text=Accident+Resolved', status: 'Resolved', createdAt: new Date(Date.now() - 172800000).toISOString() }
    ];
    const defaultCenters = [
        { _id: 'c1', name: 'Delhi NCR Evacuation Shelter', type: 'Shelter', location: { coordinates: [77.2090, 28.6139], address: 'Chanakyapuri, New Delhi' }, capacity: 500, occupied: 320, availability: 'Open' },
        { _id: 'c2', name: 'Assam Civil Disaster Hospital', type: 'Hospital', location: { coordinates: [91.7362, 26.1445], address: 'Guwahati, Assam' }, capacity: 200, occupied: 180, availability: 'Near Capacity' },
        { _id: 'c3', name: 'Joshimath Alpine Rescue Camp', type: 'Camp', location: { coordinates: [79.5660, 30.5506], address: 'Joshimath, Uttarakhand' }, capacity: 1000, occupied: 450, availability: 'Open' }
    ];
    const defaultContacts = [
        { id: '1', name: 'Delhi Fire Service Control', category: 'Fire', phone: '101', region: 'Delhi NCR' },
        { id: '2', name: 'Assam State Emergency Helpline', category: 'Medical', phone: '102', region: 'Assam' },
        { id: '3', name: 'Uttarakhand Mountain Rescue', category: 'Rescue', phone: '108', region: 'Uttarakhand' },
        { id: '4', name: 'National Disaster Response Force (NDRF)', category: 'Rescue', phone: '1078', region: 'All Regions' }
    ];
    const defaultLogs = [
        { timestamp: new Date(Date.now() - 172800000).toISOString(), action: 'Incident Resolved', user: 'Admin', details: 'Accident at Western Express Highway, Mumbai marked as resolved.' },
        { timestamp: new Date(Date.now() - 86400000).toISOString(), action: 'Incident Reported', user: 'Citizen', details: 'Landslide reported at Joshimath Hills, Uttarakhand.' },
        { timestamp: new Date(Date.now() - 10800000).toISOString(), action: 'Incident Reported', user: 'Citizen', details: 'Flood reported at Majuli Island, Assam.' },
        { timestamp: new Date(Date.now() - 3600000).toISOString(), action: 'Team Assigned', user: 'Admin', details: 'Alpha Squad assigned to Fire at Karol Bagh, New Delhi.' }
    ];
    
    let incidents = getDB('mock_incidents', defaultIncidents);
    let centers = getDB('mock_centers', defaultCenters);
    let contacts = getDB('mock_contacts', defaultContacts);
    let logs = getDB('mock_logs', defaultLogs);
    let allocations = getDB('mock_allocations', []);

    const addMockLog = (action, user, details) => {
        logs.unshift({ timestamp: new Date().toISOString(), action, user, details });
        setDB('mock_logs', logs);
    };

    let responseData = null;

    if (path === 'incidents' && method === 'GET') {
        responseData = incidents;
    } else if (path.startsWith('incidents/') && path.endsWith('/assign') && method === 'PATCH') {
        const id = path.split('/')[1];
        incidents = incidents.map(inc => {
            if (inc._id === id) {
                inc.status = 'Assigned';
                inc.assignedTeam = 'Response Squad Delta';
                addMockLog('Team Assigned', 'Admin', `Response Squad Delta dispatched to ${inc.type} at ${inc.location.address}`);
            }
            return inc;
        });
        setDB('mock_incidents', incidents);
        responseData = { success: true };
    } else if (path.startsWith('incidents/') && path.endsWith('/resolve') && method === 'PATCH') {
        const id = path.split('/')[1];
        incidents = incidents.map(inc => {
            if (inc._id === id) {
                inc.status = 'Resolved';
                addMockLog('Incident Resolved', 'Admin', `${inc.type} at ${inc.location.address} marked as resolved.`);
            }
            return inc;
        });
        setDB('mock_incidents', incidents);
        responseData = { success: true };
    } else if (path.startsWith('generate-plan/') && method === 'POST') {
        const id = path.split('/')[1];
        const inc = incidents.find(i => i._id === id);
        responseData = {
            plan: {
                strategy: `[AI RESCUE PLAN FOR ${inc ? inc.type.toUpperCase() : 'DISASTER'}]\n1. Establish containment zone at ${inc ? inc.location.address : 'site'}.\n2. Dispatch specialized mitigation team.\n3. Evacuate residents within 1.5km buffer to nearest relief camp.\n4. Standby medical first responders.`
            }
        };
        addMockLog('AI Plan Generated', 'System', `Emergency plan compiled for ${inc ? inc.type : 'incident'}`);
    } else if (path === 'report' && method === 'POST') {
        const fd = options.body;
        const type = fd.get('type') || 'Other';
        const severity = fd.get('severity') || 'Medium';
        const description = fd.get('description') || '';
        const address = fd.get('address') || 'Unknown location';
        const lat = parseFloat(fd.get('latitude') || '20.5937');
        const lng = parseFloat(fd.get('longitude') || '78.9629');
        
        const newInc = {
            _id: Date.now().toString(),
            type,
            severity,
            description,
            location: { coordinates: [lng, lat], address },
            imageUrl: 'https://placehold.co/600x400/red/white?text=' + type,
            status: 'Reported',
            createdAt: new Date().toISOString()
        };
        incidents.unshift(newInc);
        setDB('mock_incidents', incidents);
        addMockLog('Incident Reported', 'Citizen', `New ${type} [${severity}] reported at ${address}`);
        responseData = newInc;
    } else if (path === 'relief-centers' && method === 'GET') {
        responseData = centers;
    } else if (path === 'emergency-contacts' && method === 'GET') {
        responseData = contacts;
    } else if (path === 'logs' && method === 'GET') {
        responseData = logs;
    } else if (path === 'resource-allocations' && method === 'GET') {
        responseData = allocations;
    } else if (path === 'resource-allocations' && method === 'POST') {
        const payload = JSON.parse(options.body);
        const newAlloc = {
            _id: Date.now().toString(),
            incidentId: payload.incidentId,
            incidentType: payload.incidentType,
            resourceType: payload.resourceType,
            quantity: payload.quantity,
            status: 'Dispatched',
            updatedAt: new Date().toISOString()
        };
        allocations.unshift(newAlloc);
        setDB('mock_allocations', allocations);
        addMockLog('Resource Dispatched', 'Admin', `Dispatched ${payload.quantity} ${payload.resourceType} to ${payload.incidentType}`);
        responseData = newAlloc;
    } else if (path === 'analytics' && method === 'GET') {
        const total = incidents.length;
        const active = incidents.filter(i => i.status !== 'Resolved').length;
        const resolved = incidents.filter(i => i.status === 'Resolved').length;
        const teams = incidents.filter(i => i.assignedTeam).length;

        const typeCounts = {};
        incidents.forEach(inc => {
            typeCounts[inc.type] = (typeCounts[inc.type] || 0) + 1;
        });

        responseData = {
            stats: { total, active, resolved, teams },
            typeCounts
        };
    }

    return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}


let currentTab = 'citizen-portal';
let currentRole = 'citizen';
let mapInstance = null;
let markersGroup = null;
let incidentsData = [];
let reliefCentersData = [];
let emergencyContactsData = [];
let allocationsData = [];
let analyticsChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// ============================================
// INITIALIZATION
// ============================================
function initApp() {
    // Nav tabs routing
    setupNavigation();
    
    // Core incident modal
    setupModal();
    
    // Architecture Spec modal
    setupTechStackModal();
    
    // Load initial data
    fetchIncidents();
    fetchReliefCenters();
    fetchEmergencyContacts();
    
    // Role selector listener
    document.getElementById('userRoleSelect').addEventListener('change', (e) => {
        setRole(e.target.value);
    });

    // Default view setup
    switchTab('citizen-portal');
}

// ============================================
// ROLE & NAVIGATION CONTROLLERS
// ============================================
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabName = item.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Map filters
    document.getElementById('showMapIncidents').addEventListener('change', refreshMapMarkers);
    document.getElementById('showMapCenters').addEventListener('change', refreshMapMarkers);

    // Relief centers search & filtering
    document.getElementById('centerSearch').addEventListener('input', renderReliefCenters);
    document.getElementById('centerTypeFilter').addEventListener('change', renderReliefCenters);

    // Emergency contacts search & filtering
    document.getElementById('contactSearch').addEventListener('input', renderEmergencyContacts);
    document.getElementById('contactRegionFilter').addEventListener('change', renderEmergencyContacts);

    // Resource allocation form submit
    document.getElementById('allocationForm').addEventListener('submit', handleAllocationSubmit);
}

function switchTab(tabName) {
    currentTab = tabName;
    
    // Update active class in navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Hide all tab contents and show active tab content
    document.querySelectorAll('.tab-content').forEach(section => {
        if (section.id === tabName) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    });

    // Special handlers for specific tabs
    if (tabName === 'live-map') {
        initLeafletMap();
    } else if (tabName === 'admin-dashboard') {
        checkAdminAccess();
    }
}

function setRole(role) {
    currentRole = role;
    toast.info(`Switched interface role to: ${role === 'admin' ? 'System Admin' : 'Citizen'}`);
    
    // Lock/Unlock dashboard view immediately
    if (currentTab === 'admin-dashboard') {
        checkAdminAccess();
    }
}

function switchToAdminRole() {
    document.getElementById('userRoleSelect').value = 'admin';
    setRole('admin');
}

function checkAdminAccess() {
    const deniedLayer = document.getElementById('adminAccessDenied');
    const dashboardContent = document.getElementById('adminDashboardContent');
    
    if (currentRole === 'admin') {
        deniedLayer.classList.add('hidden');
        dashboardContent.style.opacity = '1';
        dashboardContent.style.pointerEvents = 'all';
        loadAdminDashboardData();
    } else {
        deniedLayer.classList.remove('hidden');
        dashboardContent.style.opacity = '0.1';
        dashboardContent.style.pointerEvents = 'none';
    }
}

// ============================================
// MAPS API MODULE (LEAFLET.JS)
// ============================================
function initLeafletMap() {
    // If map already initialized, just invalidate size so it redraws correctly
    if (mapInstance) {
        setTimeout(() => {
            mapInstance.invalidateSize();
        }, 100);
        return;
    }

    // Default center at India / South Asia region
    mapInstance = L.map('map', {
        center: [20.5937, 78.9629], // India Geographic center
        zoom: 4,
        zoomControl: true
    });

    // Load OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance);

    markersGroup = L.layerGroup().addTo(mapInstance);
    
    // Render initial markers
    refreshMapMarkers();
}

function refreshMapMarkers() {
    if (!mapInstance || !markersGroup) return;
    
    // Clear old markers
    markersGroup.clearLayers();

    const showIncidents = document.getElementById('showMapIncidents').checked;
    const showCenters = document.getElementById('showMapCenters').checked;

    const bounds = [];

    // DivIcon setups for sleek modern look
    const incidentIcon = L.divIcon({
        html: '<div style="background-color: #ff4757; width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px #ff4757;"></div>',
        className: 'custom-map-marker',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });

    const centerIcon = L.divIcon({
        html: '<div style="background-color: #2ed573; width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px #2ed573;"></div>',
        className: 'custom-map-marker',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });

    // Plot Incidents
    if (showIncidents) {
        incidentsData.forEach(incident => {
            if (incident.location && incident.location.coordinates) {
                // GeoJSON uses [lng, lat], Leaflet uses [lat, lng]
                const lng = incident.location.coordinates[0];
                const lat = incident.location.coordinates[1];
                
                if (!isNaN(lat) && !isNaN(lng)) {
                    const marker = L.marker([lat, lng], { icon: incidentIcon });
                    
                    const popupHtml = `
                        <div class="popup-details">
                            <h4>${incident.type}</h4>
                            <p><strong>Severity:</strong> ${incident.severity}</p>
                            <p><strong>Status:</strong> ${incident.status}</p>
                            <p><strong>Address:</strong> ${incident.location.address}</p>
                            <button class="btn-secondary" onclick="locateAndViewIncident('${incident._id}')">View Details</button>
                        </div>
                    `;
                    marker.bindPopup(popupHtml);
                    markersGroup.addLayer(marker);
                    bounds.push([lat, lng]);
                }
            }
        });
    }

    // Plot Relief Centers
    if (showCenters) {
        reliefCentersData.forEach(center => {
            if (center.location && center.location.coordinates) {
                const lng = center.location.coordinates[0];
                const lat = center.location.coordinates[1];
                
                if (!isNaN(lat) && !isNaN(lng)) {
                    const marker = L.marker([lat, lng], { icon: centerIcon });
                    
                    const popupHtml = `
                        <div class="popup-details">
                            <h4 style="color: #2ed573;">${center.name}</h4>
                            <p><strong>Type:</strong> ${center.type}</p>
                            <p><strong>Capacity:</strong> ${center.occupied}/${center.capacity}</p>
                            <p><strong>Status:</strong> ${center.availability}</p>
                            <p><strong>Address:</strong> ${center.location.address}</p>
                        </div>
                    `;
                    marker.bindPopup(popupHtml);
                    markersGroup.addLayer(marker);
                    bounds.push([lat, lng]);
                }
            }
        });
    }

    // Auto-fit map boundaries
    if (bounds.length > 0) {
        mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }
}

function locateOnMap(lat, lng, name) {
    switchTab('live-map');
    setTimeout(() => {
        if (mapInstance) {
            mapInstance.setView([lat, lng], 13);
            // Open matching popup if exists
            markersGroup.eachLayer(layer => {
                const latLng = layer.getLatLng();
                if (latLng.lat === lat && latLng.lng === lng) {
                    layer.openPopup();
                }
            });
        }
    }, 300);
}

function locateAndViewIncident(id) {
    switchTab('citizen-portal');
    setTimeout(() => {
        const card = document.querySelector(`.incident-card`); // simplified scroll
        if (card) card.scrollIntoView({ behavior: 'smooth' });
    }, 200);
}

// ============================================
// INCIDENTS DATA MODULE (CITIZEN PORTAL)
// ============================================
async function fetchIncidents() {
    try {
        const response = await fetch('/api/incidents');
        if (!response.ok) throw new Error("API Error");
        incidentsData = await response.json();
        renderIncidents(incidentsData);
        populateIncidentAllocationSelect(incidentsData);
    } catch (err) {
        console.error('Fetch Error:', err);
        toast.error("Could not load incidents.");
    }
}

function renderIncidents(incidents) {
    const liveGrid = document.getElementById('live-grid');
    const resolvedGrid = document.getElementById('resolved-grid');

    liveGrid.innerHTML = '';
    resolvedGrid.innerHTML = '';

    if (incidents.length === 0) {
        liveGrid.innerHTML = '<div class="empty-state">No Active Incidents</div>';
        return;
    }

    incidents.forEach(incident => {
        const card = createIncidentCard(incident);
        if (incident.status === 'Resolved') {
            resolvedGrid.appendChild(card);
        } else {
            liveGrid.appendChild(card);
        }
    });

    handleEmptyState(resolvedGrid, "No resolved cases yet.");
}

function createIncidentCard(incident) {
    const isResolved = incident.status === 'Resolved';
    const isAssigned = incident.status === 'Assigned';
    const card = document.createElement('div');

    card.className = `card incident-card priority-${incident.severity ? incident.severity.toLowerCase() : 'medium'}`;

    const icons = {
        'Fire': 'fa-fire',
        'Flood': 'fa-water',
        'Landslide': 'fa-mountain',
        'Accident': 'fa-car-burst',
        'Earthquake': 'fa-house-crack',
        'default': 'fa-circle-exclamation'
    };
    const typeIcon = icons[incident.type] || icons['default'];

    const statusClass = isResolved ? 'status-resolved' : (isAssigned ? 'status-assigned' : 'status-reported');
    const statusStyle = isResolved ? 'background: rgba(0, 255, 157, 0.15); color: #00ff9d; border: 1px solid rgba(0, 255, 157, 0.3);' : '';

    const isVideo = incident.imageUrl && (incident.imageUrl.endsWith('.mp4') || incident.imageUrl.endsWith('.webm'));
    const mediaHtml = isVideo
        ? `<video src="${incident.imageUrl}" controls class="card-media"></video>`
        : `<img src="${incident.imageUrl}" alt="${incident.type}" class="card-media" onerror="this.src='https://placehold.co/600x400?text=No+Image'">`;

    const actionsHtml = generateActionButtons(incident, isResolved, isAssigned);

    // Lat/Lng for map positioning link
    const coordinates = incident.location.coordinates;
    const mapPinButton = (coordinates && coordinates.length === 2)
        ? `<button class="btn-secondary" onclick="locateOnMap(${coordinates[1]}, ${coordinates[0]}, '${incident.type}')" title="Locate on Map" style="padding: 10px; width: 42px; flex: 0;"><i class="fa-solid fa-map-pin"></i></button>`
        : '';

    card.innerHTML = `
        <div class="card-header">
            <div class="incident-type">
                <i class="fa-solid ${typeIcon}"></i>
                <div>
                    <h3>${incident.type}</h3>
                    <span class="location"><i class="fa-solid fa-location-dot"></i> ${incident.location.address}</span>
                </div>
            </div>
            <span class="badge ${statusClass}" style="${statusStyle}">${incident.status}</span>
        </div>
        
        <div class="incident-image-container">
            ${mediaHtml}
            <div class="overlay"></div>
        </div>

        <div style="font-size: 0.9rem; line-height: 1.4; color: var(--text-muted);">${incident.description || 'No description provided.'}</div>

        <div class="card-meta">
            <div class="priority-badge ${incident.severity ? incident.severity.toLowerCase() : 'medium'}">
                <i class="fa-solid fa-triangle-exclamation"></i> ${incident.severity}
            </div>
            <span class="time"><i class="fa-regular fa-clock"></i> ${formatTimeAgo(new Date(incident.createdAt))}</span>
        </div>
        
        <div class="assignment-info ${incident.assignedTeam ? '' : 'empty'}">
            ${incident.assignedTeam ? `<i class="fa-solid fa-user-group"></i> <span>Assigned: ${incident.assignedTeam}</span>` : ''}
        </div>

        <div style="display: flex; gap: 10px;">
            ${actionsHtml}
            ${mapPinButton}
        </div>
    `;
    return card;
}

function generateActionButtons(incident, isResolved, isAssigned) {
    if (isResolved) {
        return `
            <div class="card-actions" style="flex: 1;">
                <button class="btn-secondary btn-closed" style="width: 100%;" disabled>
                    <i class="fa-solid fa-clipboard-check"></i> Case Closed
                </button>
            </div>`;
    }

    let leftButton;
    let resolveButton = '';

    if (isAssigned) {
        leftButton = `<button class="btn-secondary btn-assigned" disabled><i class="fa-solid fa-check-circle"></i> Assigned</button>`;
        resolveButton = `<button class="btn-secondary btn-resolve" onclick="markResolved('${incident._id}')" title="Resolve Case" style="flex: 0; width: 42px;"><i class="fa-solid fa-check"></i></button>`;
    } else {
        leftButton = `<button class="btn-secondary" onclick="assignTeam('${incident._id}', this)"><i class="fa-solid fa-user-plus"></i> Assign Squad</button>`;
    }

    return `
        <div class="card-actions" style="flex: 1; margin-top: 0;">
            ${leftButton}
            <button class="btn-action pulse-hover" onclick="generatePlan('${incident._id}', this)">
                <i class="fa-solid fa-robot"></i> Plan
            </button>
            ${resolveButton}
        </div>
        <div class="plan-output" id="plan-${incident._id}" style="display: none; width: 100%; padding: 12px; margin-top: 10px; background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: 8px; font-size: 0.85rem;"></div>
    `;
}

// ============================================
// INCIDENT ACTIONS
// ============================================
function assignTeam(id, btn) {
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    fetch(`/api/incidents/${id}/assign`, { method: 'PATCH' })
        .then(res => { 
            if (res.ok) {
                toast.success("Response Squad Dispatched");
                fetchIncidents(); 
            } 
        })
        .catch(err => {
            console.error(err);
            btn.innerHTML = originalContent;
            toast.error("Failed to assign team.");
        });
}

function markResolved(id) {
    if (!confirm("Are you sure you want to resolve this incident?")) return;

    fetch(`/api/incidents/${id}/resolve`, { method: 'PATCH' })
        .then(res => {
            if (res.ok) {
                toast.success("Incident Resolved Successfully!");
                fetchIncidents();
            }
        })
        .catch(err => toast.error("Error resolving incident"));
}

function generatePlan(id, btn) {
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    const planDiv = document.getElementById(`plan-${id}`);

    fetch(`/api/generate-plan/${id}`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Ready';
            btn.style.backgroundColor = '#00d4ff';

            planDiv.style.display = 'block';
            planDiv.innerHTML = data.plan.strategy.replace(/\n/g, '<br>');

            toast.info("AI Strategic Rescue Plan Generated");

            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.style.backgroundColor = '';
            }, 5000);
        })
        .catch(err => {
            console.error(err);
            btn.innerHTML = 'Error';
            toast.error("AI Generation Failed");
        });
}

// ============================================
// RELIEF CENTERS MODULE
// ============================================
async function fetchReliefCenters() {
    try {
        const response = await fetch('/api/relief-centers');
        if (!response.ok) throw new Error("API Error");
        reliefCentersData = await response.json();
        renderReliefCenters();
    } catch (err) {
        console.error("Relief Centers Error:", err);
    }
}

function renderReliefCenters() {
    const grid = document.getElementById('relief-centers-grid');
    grid.innerHTML = '';

    const searchQuery = document.getElementById('centerSearch').value.toLowerCase();
    const typeFilter = document.getElementById('centerTypeFilter').value;

    const filtered = reliefCentersData.filter(center => {
        const matchesSearch = center.name.toLowerCase().includes(searchQuery) || center.location.address.toLowerCase().includes(searchQuery);
        const matchesType = typeFilter === 'all' || center.type === typeFilter;
        return matchesSearch && matchesType;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">No relief centers match your filters.</div>';
        return;
    }

    filtered.forEach(center => {
        const card = document.createElement('div');
        card.className = 'center-card';

        const percentage = Math.round((center.occupied / center.capacity) * 100);
        const isHigh = percentage >= 85;

        card.innerHTML = `
            <div class="center-header">
                <h3>${center.name}</h3>
                <span class="center-type ${center.type}">${center.type}</span>
            </div>
            <div class="center-details">
                <p><i class="fa-solid fa-location-dot"></i> ${center.location.address}</p>
                <p><i class="fa-solid fa-circle-info"></i> Status: <strong style="color: ${center.availability === 'Open' ? '#2ed573' : '#ff4757'};">${center.availability}</strong></p>
            </div>
            
            <div class="capacity-bar">
                <div class="capacity-fill ${isHigh ? 'high' : ''}" style="width: ${percentage}%"></div>
            </div>
            <div class="capacity-text">
                <span>Occupants: ${center.occupied}/${center.capacity}</span>
                <span>${percentage}% Full</span>
            </div>
            
            <button class="contact-phone-btn" onclick="locateOnMap(${center.location.coordinates[1]}, ${center.location.coordinates[0]}, '${center.name}')">
                <i class="fa-solid fa-location-crosshairs"></i> Locate on Map
            </button>
        `;
        grid.appendChild(card);
    });
}

// ============================================
// EMERGENCY CONTACTS MODULE
// ============================================
async function fetchEmergencyContacts() {
    try {
        const response = await fetch('/api/emergency-contacts');
        if (!response.ok) throw new Error("API Error");
        emergencyContactsData = await response.json();
        renderEmergencyContacts();
    } catch (err) {
        console.error("Emergency Contacts Error:", err);
    }
}

function renderEmergencyContacts() {
    const grid = document.getElementById('contacts-grid');
    grid.innerHTML = '';

    const searchQuery = document.getElementById('contactSearch').value.toLowerCase();
    const regionFilter = document.getElementById('contactRegionFilter').value;

    const filtered = emergencyContactsData.filter(contact => {
        const matchesSearch = contact.name.toLowerCase().includes(searchQuery) || contact.phone.includes(searchQuery) || contact.category.toLowerCase().includes(searchQuery);
        const matchesRegion = regionFilter === 'all' || contact.region === regionFilter || contact.region === 'All Regions';
        return matchesSearch && matchesRegion;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">No emergency contacts found.</div>';
        return;
    }

    const categoryIcons = {
        'Fire': 'fa-fire-extinguisher',
        'Medical': 'fa-notes-medical',
        'Rescue': 'fa-life-ring'
    };

    filtered.forEach(contact => {
        const icon = categoryIcons[contact.category] || 'fa-phone';
        const card = document.createElement('div');
        card.className = 'contact-card';

        card.innerHTML = `
            <div class="contact-header">
                <h3>${contact.name}</h3>
                <i class="fa-solid ${icon}" style="font-size: 1.2rem; color: var(--primary);"></i>
            </div>
            <div class="contact-details">
                <p><i class="fa-solid fa-map-location"></i> Service Area: <strong>${contact.region}</strong></p>
                <p><i class="fa-solid fa-tag"></i> Department: ${contact.category}</p>
            </div>
            <button class="contact-phone-btn" onclick="dialNumber('${contact.phone}')">
                <i class="fa-solid fa-phone"></i> Dial: ${contact.phone}
            </button>
        `;
        grid.appendChild(card);
    });
}

function dialNumber(num) {
    toast.success(`Simulating call connection to emergency services: ${num}`);
}

// ============================================
// ADMIN CONTROL PANEL & ANALYTICS MODULE
// ============================================
async function loadAdminDashboardData() {
    try {
        const response = await fetch('/api/analytics');
        if (!response.ok) throw new Error("API Analytics Error");
        const data = await response.json();
        
        // Update stats banner
        document.getElementById('stat-total').innerText = data.stats.total;
        document.getElementById('stat-active').innerText = data.stats.active;
        document.getElementById('stat-resolved').innerText = data.stats.resolved;
        document.getElementById('stat-teams').innerText = data.stats.teams;

        // Render type analytics chart
        renderAnalyticsChart(data.typeCounts);

        // Fetch logs & allocations
        fetchSystemLogs();
        fetchResourceAllocations();

    } catch (err) {
        console.error("Dashboard Analytics Error:", err);
    }
}

function renderAnalyticsChart(typeCounts) {
    const ctx = document.getElementById('analyticsChart').getContext('2d');
    
    // Destroy existing chart to prevent hover overlay bugs
    if (analyticsChart) {
        analyticsChart.destroy();
    }

    const labels = Object.keys(typeCounts);
    const dataValues = Object.values(typeCounts);

    // Chart.js Configuration
    analyticsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Report Count',
                data: dataValues,
                backgroundColor: [
                    'rgba(255, 71, 87, 0.6)',
                    'rgba(0, 212, 255, 0.6)',
                    'rgba(240, 147, 43, 0.6)',
                    'rgba(46, 213, 115, 0.6)',
                    'rgba(165, 55, 253, 0.6)'
                ],
                borderColor: [
                    '#ff4757',
                    '#00d4ff',
                    '#f0932b',
                    '#2ed573',
                    '#a537fd'
                ],
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#a0aec0',
                        stepSize: 1
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#a0aec0'
                    }
                }
            }
        }
    });
}

function populateIncidentAllocationSelect(incidents) {
    const select = document.getElementById('allocationIncidentSelect');
    select.innerHTML = '<option value="" disabled selected>Choose active disaster...</option>';
    
    const active = incidents.filter(i => i.status !== 'Resolved');
    
    if (active.length === 0) {
        select.innerHTML = '<option value="" disabled>No active incidents</option>';
        return;
    }

    active.forEach(inc => {
        const option = document.createElement('option');
        option.value = inc._id;
        option.setAttribute('data-type', inc.type);
        option.innerText = `[${inc.severity}] ${inc.type} - ${inc.location.address}`;
        select.appendChild(option);
    });
}

async function fetchSystemLogs() {
    try {
        const response = await fetch('/api/logs');
        if (!response.ok) throw new Error("Logs error");
        const logs = await response.json();
        
        const consoleEl = document.getElementById('logsConsole');
        consoleEl.innerHTML = '';
        
        logs.forEach(log => {
            const line = document.createElement('div');
            line.className = 'log-line';
            
            const timestamp = new Date(log.timestamp).toLocaleTimeString();
            
            line.innerHTML = `
                <span class="log-time">[${timestamp}]</span> 
                <span class="log-user">(${log.user})</span> 
                <span class="log-action">${log.action}:</span> 
                <span>${log.details}</span>
            `;
            consoleEl.appendChild(line);
        });
        
        // Auto scroll console
        consoleEl.scrollTop = 0;
    } catch (err) {
        console.error("Logs Fetch Error:", err);
    }
}

async function fetchResourceAllocations() {
    try {
        const response = await fetch('/api/resource-allocations');
        if (!response.ok) throw new Error("Allocations error");
        allocationsData = await response.json();
        
        const tbody = document.getElementById('allocationsTableBody');
        tbody.innerHTML = '';
        
        if (allocationsData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="text-align: center;">No resources dispatched yet.</td></tr>';
            return;
        }

        allocationsData.forEach(alloc => {
            const tr = document.createElement('tr');
            const dateStr = new Date(alloc.updatedAt).toLocaleTimeString();
            
            tr.innerHTML = `
                <td><strong>${alloc.incidentType}</strong></td>
                <td>${alloc.resourceType}</td>
                <td>${alloc.quantity}</td>
                <td><span class="badge status-assigned" style="padding: 2px 6px;">${alloc.status}</span></td>
                <td style="color: var(--text-muted);">${dateStr}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Allocations Fetch Error:", err);
    }
}

async function handleAllocationSubmit(e) {
    e.preventDefault();
    
    const select = document.getElementById('allocationIncidentSelect');
    const selectedOption = select.options[select.selectedIndex];
    const incidentId = select.value;
    
    if (!incidentId) {
        toast.error("Please choose a target incident");
        return;
    }

    const incidentType = selectedOption.getAttribute('data-type');
    const resourceType = document.getElementById('allocationResourceType').value;
    const quantity = document.getElementById('allocationQuantity').value;

    const payload = {
        incidentId,
        incidentType,
        resourceType,
        quantity
    };

    try {
        const response = await fetch('/api/resource-allocations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Submit failed");

        toast.success(`Resources dispatched!`);
        document.getElementById('allocationForm').reset();
        
        // Reload dashboard
        loadAdminDashboardData();
    } catch (err) {
        console.error("Allocation Submit Error:", err);
        toast.error("Resource dispatch failed");
    }
}

// ============================================
// TECH STACK SPECIFICATION MODAL
// ============================================
function setupTechStackModal() {
    const modal = document.getElementById("techStackModal");
    const triggerBtn = document.getElementById("techStackTrigger");
    const closeBtn = document.querySelector(".close-tech-modal");

    triggerBtn.onclick = () => modal.style.display = "block";
    closeBtn.onclick = () => modal.style.display = "none";
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = "none";
    });
}

// ============================================
// MODAL CONTROLLER (REPORT FORM)
// ============================================
function setupModal() {
    const modal = document.getElementById("reportModal");
    const openBtn = document.querySelector(".report-btn");
    const closeBtn = document.querySelector(".close-modal");
    const form = document.getElementById("reportForm");
    const fileInput = document.getElementById("evidenceInput");
    const filePreview = document.getElementById("filePreview");
    const detectBtn = document.getElementById("detectLocationBtn");

    openBtn.onclick = () => modal.style.display = "block";
    closeBtn.onclick = () => modal.style.display = "none";
    window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; };

    fileInput.onchange = () => {
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (file.type.startsWith('image/')) {
                    filePreview.innerHTML = `<img src="${e.target.result}" alt="Preview" class="preview-media">`;
                } else if (file.type.startsWith('video/')) {
                    filePreview.innerHTML = `<video controls src="${e.target.result}" class="preview-media"></video>`;
                }
            };
            reader.readAsDataURL(file);
        }
    };

    detectBtn.onclick = () => {
        detectBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Detecting...';
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    document.getElementById("latInput").value = lat;
                    document.getElementById("lngInput").value = lng;
                    document.getElementById("addressInput").value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

                    detectBtn.innerHTML = '<i class="fa-solid fa-check"></i> Found';
                    toast.success("Location detected successfully");
                },
                () => {
                    toast.error("Geolocation failed. Enter manually.");
                    detectBtn.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Detect';
                }
            );
        } else {
            toast.error("Browser not supported.");
        }
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;

        const formData = new FormData(form);
        if (!formData.get('latitude')) {
            formData.set('latitude', '40.7128');
            formData.set('longitude', '-74.0060');
        }

        try {
            const response = await fetch('/api/report', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Submission failed');

            toast.success("Incident Reported Successfully!");
            modal.style.display = "none";
            form.reset();
            filePreview.innerHTML = '';
            
            // Reload core feeds
            fetchIncidents();
            
            // Reload map markers
            if (mapInstance) refreshMapMarkers();
        } catch (error) {
            console.error(error);
            toast.error("Failed to submit report. Try again.");
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    };
}

// ============================================
// UTILS
// ============================================
function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = {
        year: 31536000, month: 2592000, day: 86400, hour: 3600, minute: 60
    };

    for (const [unit, value] of Object.entries(intervals)) {
        const count = Math.floor(seconds / value);
        if (count >= 1) return `${count}${unit.charAt(0)} ago`;
    }
    return 'Just now';
}

function handleEmptyState(container, msg) {
    if (container.children.length === 0) {
        container.innerHTML = `<div class="empty-state">${msg}</div>`;
        container.style.display = 'block';
    }
}
