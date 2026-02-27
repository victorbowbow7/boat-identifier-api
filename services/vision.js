const vision = require('@google-cloud/vision');
const path = require('path');

// Initialize Vision client
const client = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json'
});

// Boat type mappings from labels
const BOAT_TYPE_KEYWORDS = {
  'yacht': ['yacht', 'luxury yacht', 'superyacht', 'motor yacht'],
  'sailboat': ['sailboat', 'sailing vessel', 'sloop', 'ketch', 'schooner', 'catamaran sail'],
  'speedboat': ['speedboat', 'powerboat', 'motorboat', 'runabout'],
  'fishing boat': ['fishing boat', 'trawler', 'fishing vessel', 'commercial fishing'],
  'cruise ship': ['cruise ship', 'cruise liner', 'ocean liner', 'passenger ship'],
  'cargo ship': ['cargo ship', 'container ship', 'freighter', 'bulk carrier'],
  'tugboat': ['tugboat', 'tug', 'towboat'],
  'barge': ['barge', 'houseboat', 'narrowboat'],
  'dinghy': ['dinghy', 'tender', 'rowboat', 'small boat'],
  'catamaran': ['catamaran', 'multihull', 'trimaran'],
  'submarine': ['submarine', 'submersible'],
  'ferry': ['ferry', 'passenger ferry', 'car ferry'],
  'pontoon': ['pontoon', 'pontoon boat', 'deck boat']
};

// Brand keywords
const BRAND_KEYWORDS = {
  'Sea Ray': ['sea ray', 'searay'],
  'Bayliner': ['bayliner'],
  'Boston Whaler': ['boston whaler'],
  'Grady-White': ['grady white', 'grady-white'],
  'Wellcraft': ['wellcraft'],
  'Chris-Craft': ['chris craft', 'chriscraft'],
  'Formula': ['formula boats'],
  'Four Winns': ['four winns'],
  'Cobalt': ['cobalt boats'],
  'Malibu': ['malibu boats'],
  'MasterCraft': ['mastercraft'],
  'Yamaha': ['yamaha boats', 'yamaha marine'],
  'Beneteau': ['beneteau'],
  'Jeanneau': ['jeanneau'],
  'Jeanneau': ['jeanneau'],
  'Dufour': ['dufour'],
  'Catalina': ['catalina yachts'],
  'Hunter': ['hunter marine'],
  'Hanse': ['hanse yachts'],
  'Bavaria': ['bavaria yachts'],
  'Sunseeker': ['sunseeker'],
  'Princess': ['princess yachts'],
  'Azimut': ['azimut yachts'],
  'Ferretti': ['ferretti yachts'],
  'Pershing': ['pershing yachts'],
  'Riva': ['riva yachts'],
  'Lurssen': ['lurssen'],
  'Feadship': ['feadship'],
  'Oceanco': ['oceanco'],
  'Benetti': ['benetti']
};

async function analyzeBoat(imagePath) {
  try {
    // Perform multiple detection types
    const [labelResult] = await client.labelDetection(imagePath);
    const [objectResult] = await client.objectLocalization(imagePath);
    const [colorResult] = await client.imageProperties(imagePath);
    const [webResult] = await client.webDetection(imagePath);

    const labels = labelResult.labelAnnotations || [];
    const objects = objectResult.localizedObjectAnnotations || [];
    const colors = colorResult.imagePropertiesAnnotation?.dominantColors?.colors || [];
    const webEntities = webResult.webDetection?.webEntities || [];

    // Extract boat-related labels
    const boatLabels = labels
      .filter(label => {
        const desc = label.description.toLowerCase();
        return desc.includes('boat') || 
               desc.includes('ship') || 
               desc.includes('vessel') ||
               desc.includes('yacht') ||
               desc.includes('sail') ||
               desc.includes('maritime') ||
               desc.includes('nautical');
      })
      .map(label => ({
        name: label.description,
        confidence: Math.round(label.score * 100)
      }));

    // Determine boat type
    let boatType = 'Unknown';
    let typeConfidence = 0;
    
    for (const [type, keywords] of Object.entries(BOAT_TYPE_KEYWORDS)) {
      for (const keyword of keywords) {
        const match = labels.find(l => 
          l.description.toLowerCase().includes(keyword)
        );
        if (match && match.score > typeConfidence) {
          boatType = type.charAt(0).toUpperCase() + type.slice(1);
          typeConfidence = match.score;
        }
      }
    }

    // Determine brand
    let brand = null;
    let brandConfidence = 0;
    
    for (const [brandName, keywords] of Object.entries(BRAND_KEYWORDS)) {
      for (const keyword of keywords) {
        const match = labels.find(l => 
          l.description.toLowerCase().includes(keyword)
        );
        if (match && match.score > brandConfidence) {
          brand = brandName;
          brandConfidence = match.score;
        }
      }
    }

    // Extract dominant colors
    const dominantColors = colors
      .slice(0, 3)
      .map(c => ({
        color: `rgb(${c.color.red}, ${c.color.green}, ${c.color.blue})`,
        score: Math.round(c.score * 100)
      }));

    // Calculate overall confidence
    const overallConfidence = Math.round(
      (boatLabels[0]?.confidence || 50) * 0.4 +
      (typeConfidence * 100 * 0.4) +
      (brandConfidence * 100 * 0.2)
    );

    // Extract similar boats from web detection
    const similarBoats = webEntities
      .filter(entity => {
        const desc = (entity.description || '').toLowerCase();
        return desc.includes('boat') || 
               desc.includes('yacht') || 
               desc.includes('ship') ||
               desc.includes('sail');
      })
      .slice(0, 5)
      .map(entity => ({
        name: entity.description,
        confidence: Math.round((entity.score || 0) * 100)
      }));

    return {
      boatType,
      brand,
      model: null, // Vision API doesn't reliably detect specific models
      confidence: overallConfidence,
      labels: boatLabels.slice(0, 10),
      colors: dominantColors,
      objects: objects.filter(o => 
        ['Boat', 'Ship', 'Vehicle'].includes(o.name)
      ).map(o => ({
        name: o.name,
        confidence: Math.round(o.score * 100)
      })),
      similarBoats
    };

  } catch (error) {
    console.error('Vision API error:', error);
    
    // Return fallback data if API fails
    return {
      boatType: 'Boat (Analysis Failed)',
      brand: null,
      model: null,
      confidence: 50,
      labels: [{ name: 'Watercraft', confidence: 50 }],
      colors: [],
      objects: [],
      similarBoats: [],
      error: error.message
    };
  }
}

module.exports = {
  analyzeBoat
};