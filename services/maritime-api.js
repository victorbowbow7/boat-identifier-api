const axios = require('axios');

// MarineTraffic API configuration
const MARINETRAFFIC_API_KEY = process.env.MARINETRAFFIC_API_KEY;
const MARINETRAFFIC_BASE_URL = 'https://services.marinetraffic.com/api';

// VesselFinder API configuration  
const VESSELFINDER_API_KEY = process.env.VESSELFINDER_API_KEY;
const VESSELFINDER_BASE_URL = 'https://api.vesselfinder.com';

// Mock database of known vessels for demo purposes
const MOCK_VESSELS = [
  {
    name: 'Sea Explorer',
    mmsi: '123456789',
    imo: '8765432',
    type: 'Yacht',
    length: '45m',
    tonnage: '500 GT',
    owner: 'Ocean Adventures LLC',
    location: 'Marina del Rey, CA',
    flag: 'USA'
  },
  {
    name: 'Blue Horizon',
    mmsi: '987654321',
    imo: '2345678',
    type: 'Sailboat',
    length: '18m',
    tonnage: '45 GT',
    owner: 'Private Owner',
    location: 'San Diego, CA',
    flag: 'USA'
  },
  {
    name: 'Pacific Dream',
    mmsi: '456789123',
    imo: '3456789',
    type: 'Motor Yacht',
    length: '32m',
    tonnage: '280 GT',
    owner: 'Maritime Holdings Inc',
    location: 'Newport Beach, CA',
    flag: 'Cayman Islands'
  }
];

async function searchVessel(params) {
  const { type, labels, colors, query, mmsi, imo } = params;
  
  // If MMSI or IMO provided, do direct lookup
  if (mmsi) {
    return await getVesselByMMSI(mmsi);
  }
  
  if (imo) {
    return await getVesselByIMO(imo);
  }

  // Try real APIs first, fall back to mock data
  let vesselData = null;
  
  try {
    // Attempt MarineTraffic API if key is available
    if (MARINETRAFFIC_API_KEY) {
      vesselData = await searchMarineTraffic({ type, query });
    }
  } catch (error) {
    console.log('MarineTraffic API error:', error.message);
  }

  if (!vesselData) {
    try {
      // Attempt VesselFinder API if key is available
      if (VESSELFINDER_API_KEY) {
        vesselData = await searchVesselFinder({ type, query });
      }
    } catch (error) {
      console.log('VesselFinder API error:', error.message);
    }
  }

  // Return mock data if no real data available
  if (!vesselData) {
    // Find a mock vessel that matches the type
    const matchingVessel = MOCK_VESSELS.find(v => 
      type && v.type.toLowerCase().includes(type.toLowerCase())
    ) || MOCK_VESSELS[Math.floor(Math.random() * MOCK_VESSELS.length)];
    
    return {
      ...matchingVessel,
      source: 'demo_database',
      note: 'Using demo data. Add API keys for real vessel lookup.'
    };
  }

  return vesselData;
}

async function getVesselByMMSI(mmsi) {
  try {
    // Try MarineTraffic first
    if (MARINETRAFFIC_API_KEY) {
      const response = await axios.get(
        `${MARINETRAFFIC_BASE_URL}/vesselmasterdata/v:5/${MARINETRAFFIC_API_KEY}/mmsi:${mmsi}/protocol:json`
      );
      return formatMarineTrafficData(response.data);
    }
  } catch (error) {
    console.log('MarineTraffic MMSI lookup error:', error.message);
  }

  // Fallback to mock
  const mockVessel = MOCK_VESSELS.find(v => v.mmsi === mmsi);
  if (mockVessel) {
    return { ...mockVessel, source: 'demo_database' };
  }

  return null;
}

async function getVesselByIMO(imo) {
  try {
    if (MARINETRAFFIC_API_KEY) {
      const response = await axios.get(
        `${MARINETRAFFIC_BASE_URL}/vesselmasterdata/v:5/${MARINETRAFFIC_API_KEY}/imo:${imo}/protocol:json`
      );
      return formatMarineTrafficData(response.data);
    }
  } catch (error) {
    console.log('MarineTraffic IMO lookup error:', error.message);
  }

  const mockVessel = MOCK_VESSELS.find(v => v.imo === imo);
  if (mockVessel) {
    return { ...mockVessel, source: 'demo_database' };
  }

  return null;
}

async function searchMarineTraffic(params) {
  // This would implement the actual MarineTraffic API search
  // For now, returning null to trigger fallback
  return null;
}

async function searchVesselFinder(params) {
  // This would implement the actual VesselFinder API search
  // For now, returning null to trigger fallback
  return null;
}

function formatMarineTrafficData(data) {
  if (!data || !data[0]) return null;
  
  const vessel = data[0];
  return {
    name: vessel.SHIPNAME,
    mmsi: vessel.MMSI,
    imo: vessel.IMO,
    type: vessel.SHIPTYPE,
    length: vessel.LENGTH ? `${vessel.LENGTH}m` : null,
    tonnage: vessel.DWT ? `${vessel.DWT} GT` : null,
    owner: vessel.OWNER || null,
    location: vessel.AIS_LAST_POS || null,
    flag: vessel.FLAG
  };
}

module.exports = {
  searchVessel,
  getVesselByMMSI,
  getVesselByIMO
};