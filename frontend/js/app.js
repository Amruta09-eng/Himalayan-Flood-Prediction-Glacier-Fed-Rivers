/**
 * Himalayan Flood Prediction (HimAlert AI) - Frontend Controller
 * Integrates Leaflet GIS, Chart.js multi-axis hydrographs, live Open-Meteo forecasts,
 * interactive What-If climate simulation, and disaster backtesting forensics.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Global State
  let currentStationId = "imja";
  let mapInstance = null;
  let mapMarkers = {};
  let riversLayerGroup = null;
  let glaciersLayerGroup = null;
  let stationsLayerGroup = null;
  let downstreamLayerGroup = null;
  let hydroChartInstance = null;
  let featureChartInstance = null;
  let simDebounceTimer = null;
  let currentMeltMultiplier = 1.0;

  // Station metadata for map
  const STATIONS_GEO = {
    imja: { name: "Imja Glacial Lake", lat: 27.90, lon: 86.92, type: "glof", hazard: "Moraine-dammed GLOF" },
    kedarnath: { name: "Kedarnath / Mandakini", lat: 30.73, lon: 79.07, type: "cloudburst", hazard: "Cloudburst & Lake Breach" },
    chamoli: { name: "Chamoli / Rishiganga", lat: 30.40, lon: 79.70, type: "cloudburst", hazard: "Rock-Ice Avalanche Flood" },
    lhonak: { name: "South Lhonak Lake", lat: 27.80, lon: 88.40, type: "glof", hazard: "Glacial Lake Outburst (GLOF)" },
    sutlej: { name: "Kinnaur / Sutlej", lat: 31.55, lon: 78.25, type: "cloudburst", hazard: "Glacial Melt & Cloudburst" },
    kosi: { name: "Kosi Basin (Chatra)", lat: 26.60, lon: 86.90, type: "avulsion", hazard: "Downstream Avulsion & Breach" }
  };

  // Downstream Affected Valleys, Towns, & Critical Infrastructure
  const DOWNSTREAM_IMPACT_DATA = {
    kedarnath: {
      basin: "Mandakini - Alaknanda Valley",
      river: "Mandakini River",
      sourceGlacier: "Chorabari Glacier / Gandhi Sarovar",
      baseVelocityKmH: 24,
      totalPopRisk: "195,000+ vulnerable",
      floodPathCoords: [
        [30.735, 79.067], [30.685, 79.085], [30.650, 79.112], [30.630, 79.110],
        [30.520, 79.075], [30.285, 78.980], [30.145, 78.598]
      ],
      towns: [
        { name: "Rambara Old Base", distKm: 7, lat: 30.685, lon: 79.085, popRisk: "1,200 (Pilgrim Camps & Porters)", riskBase: "Critical", criticalInfra: "Suspension Footbridges & Mule Trail", action: "Evacuate valley floor immediately to high cliff trails (+30m contour)" },
        { name: "Gaurikund Base", distKm: 14, lat: 30.650, lon: 79.112, popRisk: "4,500 (Base Camp & Hot Springs)", riskBase: "Critical", criticalInfra: "Thermal Kunds, GMVN Lodges, NH-107 Terminal", action: "Sound riverside sirens, clear hotel basements, halt uphill pilgrim movement" },
        { name: "Sonprayag", distKm: 19, lat: 30.630, lon: 79.110, popRisk: "3,800 (Parking & Transit Hub)", riskBase: "High", criticalInfra: "Vehicular Parking Complex, River Confluence Bridge", action: "Move vehicles to elevated bypass road, shut pedestrian bridge" },
        { name: "Kund / Guptkashi", distKm: 38, lat: 30.520, lon: 79.075, popRisk: "12,000 (Sub-district Hub)", riskBase: "High", criticalInfra: "Kund Highway Bridge, Low-lying Agricultural Terraces", action: "Activate SDRF outposts, monitor Kund barrage levels and silt build-up" },
        { name: "Rudraprayag Sangam", distKm: 72, lat: 30.285, lon: 78.980, popRisk: "25,000 (District HQ & Sangam)", riskBase: "Medium", criticalInfra: "Mandakini-Alaknanda Confluence Ghats, NH-58 River Bridge", action: "Clear Sangam Ghats, open downstream Alaknanda barrage gates" },
        { name: "Devprayag & Rishikesh", distKm: 135, lat: 30.145, lon: 78.598, popRisk: "150,000+ (Urban Foothills)", riskBase: "Watch", criticalInfra: "Pashulok Barrage, Chilla Power Canal, Triveni Ghat", action: "Regulate Pashulok Barrage gates, alert Haridwar administration" }
      ]
    },
    chamoli: {
      basin: "Rishi Ganga - Dhauliganga - Alaknanda",
      river: "Rishi Ganga / Dhauliganga",
      sourceGlacier: "Nanda Devi & Ronti Glacier",
      baseVelocityKmH: 26,
      totalPopRisk: "75,000+ vulnerable",
      floodPathCoords: [
        [30.400, 79.700], [30.485, 79.700], [30.500, 79.625], [30.550, 79.560],
        [30.410, 79.330], [30.260, 79.220], [30.285, 78.980]
      ],
      towns: [
        { name: "Raini Village & Bridge", distKm: 6, lat: 30.485, lon: 79.700, popRisk: "850 (Raini settlement)", riskBase: "Critical", criticalInfra: "Rishi Ganga Hydro Intake, Historic Border Road Bridge", action: "Immediate mountain slope climb, sound village horn, halt road traffic" },
        { name: "Tapovan Hydel Project", distKm: 15, lat: 30.500, lon: 79.625, popRisk: "2,200 (NTPC Project Barrage & Workers)", riskBase: "Critical", criticalInfra: "NTPC Tapovan-Vishnugad Barrage & Head Race Tunnel", action: "Evacuate underground tunnels immediately, trigger automated plant shutoff" },
        { name: "Joshimath Lower Terraces", distKm: 24, lat: 30.550, lon: 79.560, popRisk: "16,000 (Hill Station & Garrison)", riskBase: "High", criticalInfra: "Helipad, Badrinath Highway Bridge, Army Base Camp", action: "Halt Badrinath highway traffic, monitor slope toe erosion" },
        { name: "Chamoli / Pipalkoti", distKm: 52, lat: 30.410, lon: 79.330, popRisk: "28,000 (District Headquarters)", riskBase: "High", criticalInfra: "Pipalkoti Hydro Dam, NH-58 Riverbank Retaining Walls", action: "Alert SDRF & District Disaster Management Authority, clear ghats" },
        { name: "Karnaprayag Sangam", distKm: 78, lat: 30.260, lon: 79.220, popRisk: "22,000 (Pindar-Alaknanda Sangam)", riskBase: "Medium", criticalInfra: "Pindar Confluence Market, Railway Tunnel Portal", action: "Clear riverbed markets, secure RVNL rail construction sites" }
      ]
    },
    imja: {
      basin: "Dudh Koshi - Everest Sub-basin",
      river: "Imja Khola / Dudh Koshi",
      sourceGlacier: "Imja Tsho & Lhotse Shar Glacier",
      baseVelocityKmH: 22,
      totalPopRisk: "12,000+ Sherpa villages & trekkers",
      floodPathCoords: [
        [27.900, 86.920], [27.892, 86.832], [27.857, 86.793], [27.834, 86.764],
        [27.742, 86.712], [27.685, 86.720]
      ],
      towns: [
        { name: "Dingboche Settlement", distKm: 6, lat: 27.892, lon: 86.832, popRisk: "900 (High-altitude Sherpa Lodges & Trekkers)", riskBase: "Critical", criticalInfra: "Lodge clusters, Imja Khola footbridges", action: "Climb eastern valley moraine ridges to +50m safety contour immediately" },
        { name: "Pangboche & Somare", distKm: 12, lat: 27.857, lon: 86.793, popRisk: "1,400 (Ancient Monastery & Settlements)", riskBase: "Critical", criticalInfra: "Pangboche suspension bridge, hydroelectric micro-turbine", action: "Evacuate lower trail lodges, broadcast warning via VHF radio to trekking guides" },
        { name: "Phunki Tenga / Tengboche", distKm: 18, lat: 27.834, lon: 86.764, popRisk: "1,100 (River crossing & porter stops)", riskBase: "High", criticalInfra: "High steel suspension bridge, water-driven prayer wheels", action: "Close Dudh Koshi suspension bridge, direct trekkers upward to Tengboche ridge" },
        { name: "Phakding / Ghat", distKm: 32, lat: 27.742, lon: 86.712, popRisk: "3,200 (Primary Everest Trek Stop)", riskBase: "High", criticalInfra: "Riverside trek lodges, suspension bridges", action: "Immediate evacuation from river bank to upper pine forest slope" },
        { name: "Lukla River Gorge", distKm: 42, lat: 27.685, lon: 86.720, popRisk: "5,000 (Lukla Airport foothills)", riskBase: "Medium", criticalInfra: "Surke bridge, Lukla micro-hydel power station", action: "Halt porter caravans, notify Sagarmatha National Park HQ" }
      ]
    },
    lhonak: {
      basin: "Teesta Basin (North Sikkim)",
      river: "Teesta River",
      sourceGlacier: "South Lhonak Glacial Lake",
      baseVelocityKmH: 28,
      totalPopRisk: "140,000+ vulnerable",
      floodPathCoords: [
        [27.800, 88.400], [27.600, 88.640], [27.390, 88.520], [27.235, 88.500],
        [27.175, 88.530], [26.900, 88.600]
      ],
      towns: [
        { name: "Chungthang & Dam Site", distKm: 32, lat: 27.600, lon: 88.640, popRisk: "4,200 (Army Camp & Chungthang Town)", riskBase: "Critical", criticalInfra: "Teesta III 1200MW Hydro Dam, Indo-Tibetan Border Road", action: "Immediate high ground evacuation, open dam discharge sluices completely" },
        { name: "Dikchu Hydro Hub", distKm: 60, lat: 27.390, lon: 88.520, popRisk: "3,500 (Dikchu Bazar & Powerhouse)", riskBase: "Critical", criticalInfra: "Dikchu Hydro Electric Powerhouse & Bridge", action: "Sound sirens, cut power distribution, clear downstream bazaar" },
        { name: "Singtam Urban Center", distKm: 82, lat: 27.235, lon: 88.500, popRisk: "18,000 (Commercial Hub)", riskBase: "High", criticalInfra: "Indreni Bridge, NH-10 Riverbank Highway, Residential wards", action: "Evacuate ground floors, halt all NH-10 highway traffic" },
        { name: "Rangpo Border Town", distKm: 98, lat: 27.175, lon: 88.530, popRisk: "22,000 (Sikkim-Bengal Border Checkpoint)", riskBase: "High", criticalInfra: "Mining Ground, Railway Tunnel Site, Border Toll Gates", action: "Seal low-lying border bridge, alert West Bengal civil defense" },
        { name: "Teesta Bazar & Gajoldoba Barrage", distKm: 135, lat: 26.900, lon: 88.600, popRisk: "90,000+ (Foothill Plain Settlements)", riskBase: "Medium", criticalInfra: "Teesta Barrage, Coronation Bridge, Jalpaiguri canals", action: "Raise Teesta Barrage gates to maximum flood clearance" }
      ]
    },
    sutlej: {
      basin: "Sutlej - Spiti Valley (Kinnaur)",
      river: "Sutlej River",
      sourceGlacier: "Tirung & Baspa Glaciers",
      baseVelocityKmH: 24,
      totalPopRisk: "48,000+ vulnerable",
      floodPathCoords: [
        [31.550, 78.250], [31.720, 78.650], [31.600, 78.450], [31.500, 78.180],
        [31.400, 77.630]
      ],
      towns: [
        { name: "Khab Sangam", distKm: 16, lat: 31.720, lon: 78.650, popRisk: "650 (Spiti-Sutlej Confluence)", riskBase: "Critical", criticalInfra: "NH-505 National Highway Bridge, ITBP Border Post", action: "Seal confluence crossing, warn upstream Spiti outposts" },
        { name: "Pooh & Spillow", distKm: 34, lat: 31.600, lon: 78.450, popRisk: "4,500 (Sub-Divisional Town)", riskBase: "High", criticalInfra: "NH-5 Indo-Tibet Road riverbank stretches", action: "Stop vehicular traffic on NH-5, move road workers to heights" },
        { name: "Karcham Wangtoo Dam", distKm: 76, lat: 31.500, lon: 78.180, popRisk: "8,000 (Mega 1000MW Hydro Dam)", riskBase: "High", criticalInfra: "Karcham Wangtoo Concrete Gravity Dam & Powerhouse", action: "Engage radial spillway gates, notify Central Water Commission" },
        { name: "Rampur Bushahr", distKm: 120, lat: 31.400, lon: 77.630, popRisk: "35,000 (Commercial Foothill City)", riskBase: "Medium", criticalInfra: "Nathpa Jhakri 1500MW Hydro Project, Rampur Bazar Ghats", action: "Flush Nathpa silt desilting basins, sound municipal warning" }
      ]
    },
    kosi: {
      basin: "Sapta Kosi Gorge (Eastern Himalayas / Nepal)",
      river: "Sun Kosi - Arun - Tamor -> Sapta Kosi",
      sourceGlacier: "Khumbu / Barun Glacial Network",
      baseVelocityKmH: 20,
      totalPopRisk: "275,000+ vulnerable",
      floodPathCoords: [
        [26.600, 86.900], [26.900, 87.160], [26.830, 87.160], [26.750, 87.120],
        [26.520, 86.930]
      ],
      towns: [
        { name: "Tribeni Sangam", distKm: 15, lat: 26.900, lon: 87.160, popRisk: "2,500 (Triple River Confluence)", riskBase: "Critical", criticalInfra: "Tribeni suspension bridge, pilgrimage temples", action: "Sound riverside gong alarms, clear holy ghats" },
        { name: "Chatra Gorge Mouth", distKm: 32, lat: 26.830, lon: 87.160, popRisk: "14,000 (Canyon Exit to Terai Plains)", riskBase: "High", criticalInfra: "Chatra Canal Intake Works, Water Treatment Headworks", action: "Lock irrigation canal headworks to prevent silt rupture" },
        { name: "Barahkshetra Mandir", distKm: 42, lat: 26.750, lon: 87.120, popRisk: "9,000 (Historic Riverbank Shrine)", riskBase: "High", criticalInfra: "Heritage temples & riverside pilgrim dharamshalas", action: "Direct pilgrims to high sandstone hills" },
        { name: "Kosi Barrage (Bhimnagar)", distKm: 75, lat: 26.520, lon: 86.930, popRisk: "250,000+ (Nepal-India Border Plain)", riskBase: "Critical", criticalInfra: "56 Giant Barrage Sluice Gates, East-West Highway", action: "Open all 56 flood sluice gates, issue red alert to Bihar state" }
      ]
    }
  };

  // Major World & Himalayan Highlighted River Networks
  const MAJOR_RIVERS = [
    {
      id: "mandakini",
      name: "Mandakini River",
      system: "Ganges Basin (Garhwal)",
      sourceGlacier: "Chorabari Glacier",
      velocity: "4.8 m/s (Steep Mountain Torrent)",
      peakSurge: "1,200 m³/s (During 2013 Cloudburst)",
      risk: "Extreme Convective Cloudburst Surge",
      desc: "Drains Chorabari Glacier past Kedarnath, Rambara, and Guptkashi into the Alaknanda at Rudraprayag.",
      coords: [[30.735, 79.067], [30.640, 79.120], [30.540, 79.090], [30.450, 79.050], [30.340, 79.010], [30.285, 78.980]]
    },
    {
      id: "alaknanda",
      name: "Alaknanda River",
      system: "Ganges Basin (Garhwal)",
      sourceGlacier: "Satopanth & Bhagirath Kharak Glaciers",
      velocity: "3.9 m/s",
      peakSurge: "3,800 m³/s",
      risk: "Rock-Ice Avalanche & Landslide Dam Breaches",
      desc: "Major headstream of the Ganges; flows past Badrinath, Joshimath, Chamoli, meeting Mandakini at Rudraprayag and Bhagirathi at Devprayag.",
      coords: [[30.745, 79.493], [30.620, 79.540], [30.550, 79.560], [30.410, 79.330], [30.330, 79.150], [30.285, 78.980], [30.220, 78.780], [30.145, 78.598]]
    },
    {
      id: "bhagirathi",
      name: "Bhagirathi River",
      system: "Ganges Basin (Garhwal)",
      sourceGlacier: "Gangotri Glacier (Gaumukh)",
      velocity: "3.5 m/s",
      peakSurge: "2,400 m³/s",
      risk: "Thermal Glacial Melt Surges & Monsoon Spikes",
      desc: "Originates at Gaumukh terminus of Gangotri Glacier, forming the Ganges upon merging with Alaknanda at Devprayag.",
      coords: [[30.985, 78.935], [30.820, 78.680], [30.730, 78.440], [30.550, 78.450], [30.380, 78.480], [30.145, 78.598]]
    },
    {
      id: "ganga",
      name: "Ganges (Main Trunk River)",
      system: "Indo-Gangetic Basin",
      sourceGlacier: "Gangotri / Alaknanda Confluence",
      velocity: "1.8 m/s (Lowland Plains)",
      peakSurge: "70,000 m³/s (Monsoon Peak)",
      risk: "Widespread Inundation & Embankment Breaches",
      desc: "Lifeline river of northern India, carrying alpine snowmelt and monsoon rainfall across 2,525 km into the Bay of Bengal.",
      coords: [[30.145, 78.598], [30.080, 78.260], [29.940, 78.160], [29.500, 78.200], [28.600, 79.000], [27.500, 80.000], [26.450, 80.330], [25.500, 81.850], [25.310, 82.970], [25.590, 85.130], [25.350, 87.250], [24.800, 88.000], [23.500, 88.350], [22.000, 89.500]]
    },
    {
      id: "indus",
      name: "Indus River",
      system: "Indus Basin (Trans-Himalayan)",
      sourceGlacier: "Tibetan Plateau / Gar Tsangpo",
      velocity: "3.2 m/s",
      peakSurge: "31,000 m³/s",
      risk: "Glacial Surges & Downstream Catastrophic Flooding",
      desc: "3,180 km trans-boundary giant draining Karakoram and Himalayan ice through Ladakh and Pakistan to the Arabian Sea.",
      coords: [[31.50, 81.50], [32.50, 79.80], [33.50, 78.50], [34.15, 77.57], [34.80, 76.50], [35.29, 75.63], [35.92, 74.31], [35.40, 73.50], [34.92, 72.87], [34.09, 72.70], [33.50, 72.00], [31.50, 71.20], [29.50, 70.80], [26.50, 68.00], [24.00, 67.50]]
    },
    {
      id: "sutlej",
      name: "Sutlej River",
      system: "Indus Basin (Himachal / Punjab)",
      sourceGlacier: "Lake Rakshastal / Tibetan Cryosphere",
      velocity: "3.6 m/s in Kinnaur Canyons",
      peakSurge: "4,500 m³/s",
      risk: "Flash Floods & Debris Dam Outbursts",
      desc: "Rushes through deep gorges of Kinnaur, supplying Bhakra Dam and the Punjab plains.",
      coords: [[30.60, 81.30], [31.55, 78.25], [31.45, 77.63], [31.41, 76.43], [31.10, 75.00], [29.30, 71.00]]
    },
    {
      id: "brahmaputra",
      name: "Brahmaputra / Yarlung Tsangpo",
      system: "Eastern Himalayan Basin",
      sourceGlacier: "Angsi Glacier (Tibet)",
      velocity: "3.8 m/s in Tsangpo Gorge",
      peakSurge: "100,000 m³/s",
      risk: "Landslide Dams & High-Discharge Braided Surges",
      desc: "Flies across southern Tibet, carves the world's deepest canyon around Namcha Barwa, then floods through Assam and Bangladesh.",
      coords: [[30.35, 82.02], [29.80, 84.50], [29.40, 87.00], [29.27, 88.88], [29.30, 91.10], [29.20, 93.00], [29.79, 95.05], [28.80, 95.30], [28.06, 95.33], [27.47, 94.91], [26.80, 93.50], [26.14, 91.73], [26.00, 89.90], [24.00, 89.70], [22.20, 90.50]]
    },
    {
      id: "teesta",
      name: "Teesta River",
      system: "Brahmaputra Tributary (Sikkim)",
      sourceGlacier: "South Lhonak Lake & Tso Lhamo",
      velocity: "5.1 m/s (Violent Himalayan Gorge)",
      peakSurge: "3,000 m³/s (During 2023 GLOF)",
      risk: "Moraine Breach GLOF & Dam Destruction",
      desc: "Drains Sikkim Himalayas into Bengal; washed away Chungthang Hydro Dam during the Oct 2023 South Lhonak GLOF.",
      coords: [[27.95, 88.60], [27.80, 88.40], [27.60, 88.64], [27.50, 88.53], [27.23, 88.50], [26.88, 88.47], [26.54, 88.72], [25.70, 89.50], [25.30, 89.70]]
    },
    {
      id: "kosi",
      name: "Kosi River (Sorrow of Bihar)",
      system: "Ganges Basin (Nepal / Bihar)",
      sourceGlacier: "Khumbu / Imja Glaciers (Dudh Koshi)",
      velocity: "2.8 m/s",
      peakSurge: "24,000 m³/s",
      risk: "Violent River Avulsion & Silt Overload",
      desc: "Collects 7 Himalayan rivers through Chatra Gorge; infamous for avulsion shifts and shifting channels across 150 km.",
      coords: [[27.90, 86.92], [27.60, 86.75], [27.20, 86.70], [27.00, 87.10], [26.82, 87.16], [26.60, 86.90], [26.52, 86.93], [25.88, 86.60], [25.35, 87.25]]
    },
    {
      id: "yangtze",
      name: "Yangtze River (Headwaters)",
      system: "Tibetan Plateau / East Asia",
      sourceGlacier: "Geladandong Glacier (Qinghai)",
      velocity: "2.5 m/s",
      peakSurge: "80,000 m³/s",
      risk: "Alpine Snowmelt Surges & Downstream Inundation",
      desc: "Longest river in Eurasia (6,300 km), originating from Tibetan glaciers in the Third Pole cryosphere.",
      coords: [[33.80, 92.50], [33.50, 95.00], [31.50, 98.00], [28.00, 100.00], [29.00, 104.00], [30.60, 114.30], [31.20, 121.50]]
    },
    {
      id: "mekong",
      name: "Mekong River (Lancang Headwaters)",
      system: "Southeast Asian Cryosphere Basin",
      sourceGlacier: "Lasagongma Glacier (Tibet)",
      velocity: "2.4 m/s",
      peakSurge: "45,000 m³/s",
      risk: "Glacial Melt Pulses & Monsoon Flooding",
      desc: "Drains high Tibetan ice sheets through 6 nations down to the Mekong Delta.",
      coords: [[33.20, 94.40], [31.00, 97.50], [27.50, 99.50], [21.50, 101.50], [18.00, 103.00], [10.50, 106.50]]
    },
    {
      id: "rhine",
      name: "Rhine River (Alps)",
      system: "Western Europe",
      sourceGlacier: "Tomasee / Swiss Alps Glaciers",
      velocity: "2.1 m/s",
      peakSurge: "4,000 m³/s",
      risk: "Alps Rain-on-Snow Flooding",
      desc: "Drains Swiss glacial melt through Lake Constance down to the North Sea.",
      coords: [[46.60, 8.70], [47.50, 7.60], [48.60, 8.00], [50.00, 8.30], [51.90, 4.50]]
    },
    {
      id: "danube",
      name: "Danube River",
      system: "Central & Eastern Europe",
      sourceGlacier: "Alps & Black Forest Drainage",
      velocity: "1.9 m/s",
      peakSurge: "11,000 m³/s",
      risk: "Spring Snowmelt Surges",
      desc: "Flows through 10 European nations from Germany to the Black Sea.",
      coords: [[48.00, 8.20], [48.20, 16.40], [47.50, 19.00], [44.80, 20.50], [45.20, 29.60]]
    },
    {
      id: "amazon",
      name: "Amazon River (Andes Headwaters)",
      system: "South American Basin",
      sourceGlacier: "Nevado Mismi Glacial Stream (Andes)",
      velocity: "2.5 m/s",
      peakSurge: "220,000 m³/s (World Largest)",
      risk: "Tropical Flash Surges & Glacier Retreat",
      desc: "World's largest river by discharge, originating in high glaciated Peruvian peaks.",
      coords: [[-15.50, -71.70], [-13.00, -73.50], [-7.00, -73.00], [-3.80, -73.20], [-3.10, -60.00], [-1.50, -52.00], [0.00, -50.00]]
    },
    {
      id: "colorado",
      name: "Colorado River",
      system: "North American Rocky Mountain Basin",
      sourceGlacier: "La Poudre Pass / Rockies Snowpack",
      velocity: "2.2 m/s",
      peakSurge: "2,800 m³/s",
      risk: "Spring Snowmelt Pulses",
      desc: "Carves the Grand Canyon fueled by high-altitude Rocky Mountain meltwater.",
      coords: [[40.40, -105.80], [39.00, -108.50], [38.50, -109.50], [36.10, -112.10], [34.50, -114.40], [32.00, -114.80]]
    }
  ];

  // Highlighted World & Himalayan Glaciers & Proglacial Lakes
  const MAJOR_GLACIERS = [
    {
      id: "siachen",
      name: "Siachen Glacier",
      range: "East Karakoram",
      country: "Ladakh / India",
      elevation: "5,400 m a.s.l.",
      dimension: "76 km (Longest Non-Polar Glacier)",
      retreatRate: "18 m / year",
      hazard: "Crevasse & Avalanche Melt Pulses",
      hazardColor: "#F59E0B",
      details: "World's second longest non-polar glacier, feeding the Nubra and Shyok tributaries of the Indus.",
      lat: 35.50,
      lon: 77.00
    },
    {
      id: "gangotri",
      name: "Gangotri Glacier",
      range: "Garhwal Himalayas",
      country: "Uttarakhand, India",
      elevation: "3,920 m – 7,000 m",
      dimension: "30 km length (~143 km²)",
      retreatRate: "22 m / year (Accelerating)",
      hazard: "High Glacial Lake Formation",
      hazardColor: "#F97316",
      details: "Sacred source of the Bhagirathi River; rapid retreat has created unstable supraglacial moraine ponds.",
      lat: 30.92,
      lon: 79.08
    },
    {
      id: "khumbu",
      name: "Khumbu Glacier & Icefall",
      range: "Everest / Mahalangur",
      country: "Nepal",
      elevation: "4,900 m – 7,600 m",
      dimension: "17 km length",
      retreatRate: "15 m / year",
      hazard: "Dynamic Ice Serac Collapses",
      hazardColor: "#F59E0B",
      details: "Highest glacier on Earth; terminal moraine feeds Dudh Koshi into the Kosi River system.",
      lat: 27.98,
      lon: 86.87
    },
    {
      id: "imja",
      name: "Imja Glacial Lake & Glacier",
      range: "Everest Region",
      country: "Khumbu, Nepal",
      elevation: "5,010 m",
      dimension: "75 m deep moraine lake (1.28 km²)",
      retreatRate: "Expanded by 400% since 1960",
      hazard: "Critical GLOF Moraine Failure Risk",
      hazardColor: "#EF4444",
      details: "One of the most dangerous proglacial lakes in the Himalayas; monitored 24/7 for moraine dam piping failure.",
      linkedStation: "imja",
      lat: 27.90,
      lon: 86.92
    },
    {
      id: "lhonak",
      name: "South Lhonak Glacial Lake",
      range: "Kangchenjunga Cryosphere",
      country: "North Sikkim, India",
      elevation: "5,200 m",
      dimension: "168 hectares proglacial lake",
      retreatRate: "Oct 2023 Catastrophic Breach",
      hazard: "Historical GLOF Rupture Site",
      hazardColor: "#EF4444",
      details: "Moraine burst on Oct 4, 2023 causing a flash flood exceeding 3,000 m³/s down the Teesta River.",
      linkedStation: "lhonak",
      lat: 27.91,
      lon: 88.20
    },
    {
      id: "chorabari",
      name: "Chorabari Glacier & Lake",
      range: "Kedarnath / Garhwal",
      country: "Uttarakhand, India",
      elevation: "3,895 m",
      dimension: "7 km glacier length",
      retreatRate: "Moraine collapse in 2013",
      hazard: "Extreme Moraine Breaching",
      hazardColor: "#EF4444",
      details: "Gandhi Sarovar moraine burst in June 2013 following a 325 mm cloudburst, flooding Kedarnath town.",
      linkedStation: "kedarnath",
      lat: 30.76,
      lon: 79.06
    },
    {
      id: "baltoro",
      name: "Baltoro Glacier",
      range: "Karakoram / K2",
      country: "Gilgit-Baltistan",
      elevation: "4,000 m – 8,611 m",
      dimension: "63 km length",
      retreatRate: "Glacial Surge Dynamic",
      hazard: "Supraglacial Lake Surges",
      hazardColor: "#F59E0B",
      details: "Feeds the Braldu River and Indus; surrounded by four 8,000m peaks including K2 and Broad Peak.",
      lat: 35.73,
      lon: 76.43
    },
    {
      id: "rishiganga",
      name: "Nanda Devi / Rishiganga Hang",
      range: "Chamoli / Garhwal",
      country: "Uttarakhand, India",
      elevation: "5,600 m",
      dimension: "Hanging Ice-Rock Wedge",
      retreatRate: "2021 Rock-Ice Avalanche Detachment",
      hazard: "Sudden Valley Damming Flood",
      hazardColor: "#EF4444",
      details: "Feb 7, 2021 disaster: 27 million m³ of rock-ice detached from Ronti peak, destroying Tapovan hydro project.",
      linkedStation: "chamoli",
      lat: 30.40,
      lon: 79.73
    },
    {
      id: "fedchenko",
      name: "Fedchenko Glacier",
      range: "Pamir Mountains",
      country: "Tajikistan",
      elevation: "4,800 m",
      dimension: "77 km (Longest Glacier in Central Asia)",
      retreatRate: "12 m / year",
      hazard: "Melt Pulse Flood Hazard",
      hazardColor: "#F59E0B",
      details: "Massive Pamir ice highway feeding the Muksu and Amu Darya river basins.",
      lat: 38.75,
      lon: 72.30
    },
    {
      id: "aletsch",
      name: "Great Aletsch Glacier",
      range: "Bernese Alps",
      country: "Switzerland",
      elevation: "2,800 m – 4,150 m",
      dimension: "23 km length (~80 km²)",
      retreatRate: "50 m / year (Rapid)",
      hazard: "Alpine Rockfalls & Glacial Lakes",
      hazardColor: "#F97316",
      details: "Largest glacier in the Alps; UNESCO World Heritage site losing up to 50 meters of length annually.",
      lat: 46.50,
      lon: 8.03
    },
    {
      id: "perito_moreno",
      name: "Perito Moreno Glacier",
      range: "Patagonian Andes",
      country: "Argentina",
      elevation: "200 m – 1,500 m",
      dimension: "30 km length (250 km²)",
      retreatRate: "Dynamic Ice Dam Rupture Cycle",
      hazard: "Periodic Damming & Outburst Floods",
      hazardColor: "#F59E0B",
      details: "Dams Lake Argentino until pressure ruptures the ice bridge in spectacular outburst surges.",
      lat: -50.48,
      lon: -73.05
    },
    {
      id: "jakobshavn",
      name: "Jakobshavn Glacier (Sermeq Kujalleq)",
      range: "Greenland Ice Sheet",
      country: "Greenland",
      elevation: "Sea Level Calving Tongue",
      dimension: "Fastest flowing ice stream (40 m/day)",
      retreatRate: "Major Global Cryosphere Calver",
      hazard: "Massive Iceberg Discharge & Sea Level Rise",
      hazardColor: "#EF4444",
      details: "Drains 6.5% of Greenland Ice Sheet, producing huge icebergs in Disko Bay.",
      lat: 69.17,
      lon: -49.83
    },
    {
      id: "athabasca",
      name: "Athabasca Glacier",
      range: "Canadian Rockies",
      country: "Alberta, Canada",
      elevation: "2,700 m",
      dimension: "6 km length (Columbia Icefield)",
      retreatRate: "10 m / year (Lost >50% volume in 125 yrs)",
      hazard: "Cryosphere Water Security Loss",
      hazardColor: "#F59E0B",
      details: "Key water tower feeding the Athabasca River and Arctic drainage basin.",
      lat: 52.19,
      lon: -117.24
    }
  ];

  // Initialize Modules
  initTheme();
  initNavigation();
  initLeafletMap();
  initCustomCoordsModal();
  initSimulatorControls();
  
  // Initial Data Fetch
  loadStationForecast(currentStationId);
  loadHistoricalDisasters();
  loadScientificReport();

  // -------------------------------------------------------------
  // Theme Manager & Color Palette Controller
  // -------------------------------------------------------------
  function getThemeColors() {
    const activeTheme = document.body.getAttribute("data-theme") || "cyan";
    const isLight = activeTheme === "light";

    let primary = "#38BDF8";
    let primaryBg = "rgba(56, 189, 248, 0.08)";
    let barPalette = ["#38BDF8", "#0284C7", "#0EA5E9", "#34D399", "#F59E0B", "#A855F7"];

    if (activeTheme === "emerald") {
      primary = "#34D399";
      primaryBg = "rgba(52, 211, 153, 0.08)";
      barPalette = ["#34D399", "#10B981", "#059669", "#0D9488", "#14B8A6", "#38BDF8"];
    } else if (activeTheme === "indigo") {
      primary = "#818CF8";
      primaryBg = "rgba(129, 140, 248, 0.08)";
      barPalette = ["#818CF8", "#6366F1", "#A855F7", "#C084FC", "#38BDF8", "#F59E0B"];
    } else if (activeTheme === "light") {
      primary = "#0284C7";
      primaryBg = "rgba(2, 132, 199, 0.08)";
      barPalette = ["#0284C7", "#059669", "#D97706", "#7C3AED", "#2563EB", "#DC2626"];
    }

    return {
      activeTheme,
      isLight,
      primary,
      primaryBg,
      barPalette,
      gridColor: isLight ? "rgba(0, 0, 0, 0.07)" : "rgba(255, 255, 255, 0.06)",
      tickColor: isLight ? "#475569" : "#94A3B8",
      dimColor: isLight ? "#64748B" : "#64748B",
      yTickColor: isLight ? "#1E293B" : "#CBD5E1",
      tooltipBg: isLight ? "rgba(255, 255, 255, 0.95)" : "rgba(15, 23, 42, 0.92)",
      tooltipBorder: isLight ? "rgba(203, 213, 225, 0.8)" : "rgba(56, 189, 248, 0.3)",
      tooltipTitle: isLight ? "#0F172A" : "#F1F5F9",
      tooltipBody: isLight ? "#334155" : "#E2E8F0"
    };
  }

  function initTheme() {
    const savedTheme = localStorage.getItem("himalert_theme") || "light";
    const themeSelect = document.getElementById("themeSelect");
    if (themeSelect) {
      themeSelect.value = savedTheme;
      themeSelect.addEventListener("change", (e) => {
        applyTheme(e.target.value);
      });
    }
    applyTheme(savedTheme);
  }

  function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("himalert_theme", theme);
    updateChartsTheme();
  }

  function updateChartsTheme() {
    const tc = getThemeColors();

    if (hydroChartInstance) {
      if (hydroChartInstance.data.datasets[0]) {
        hydroChartInstance.data.datasets[0].borderColor = tc.primary;
        hydroChartInstance.data.datasets[0].backgroundColor = tc.primaryBg;
      }
      if (hydroChartInstance.options.scales.x) {
        hydroChartInstance.options.scales.x.grid.color = tc.gridColor;
        hydroChartInstance.options.scales.x.ticks.color = tc.dimColor;
      }
      if (hydroChartInstance.options.scales.y) {
        hydroChartInstance.options.scales.y.grid.color = tc.gridColor;
        hydroChartInstance.options.scales.y.ticks.color = tc.primary;
        hydroChartInstance.options.scales.y.title.color = tc.tickColor;
      }
      if (hydroChartInstance.options.plugins && hydroChartInstance.options.plugins.legend) {
        hydroChartInstance.options.plugins.legend.labels.color = tc.tickColor;
      }
      hydroChartInstance.update();
    }

    if (featureChartInstance) {
      if (featureChartInstance.data.datasets[0]) {
        featureChartInstance.data.datasets[0].backgroundColor = tc.barPalette;
      }
      if (featureChartInstance.options.scales.x) {
        featureChartInstance.options.scales.x.grid.color = tc.gridColor;
        featureChartInstance.options.scales.x.ticks.color = tc.dimColor;
      }
      if (featureChartInstance.options.scales.y) {
        featureChartInstance.options.scales.y.ticks.color = tc.yTickColor;
      }
      featureChartInstance.update();
    }
  }

  // -------------------------------------------------------------
  // 1. Navigation Controller
  // -------------------------------------------------------------
  function initNavigation() {
    const tabs = document.querySelectorAll(".nav-tab");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        const targetPaneId = tab.dataset.tab;
        document.querySelectorAll(".tab-pane").forEach(pane => {
          pane.classList.remove("active");
        });
        const activePane = document.getElementById(targetPaneId);
        if (activePane) {
          activePane.classList.add("active");
        }

        // If switching to telemetry, invalidate map size to prevent gray tiles
        if (targetPaneId === "tab-telemetry" && mapInstance) {
          setTimeout(() => mapInstance.invalidateSize(), 200);
        }
      });
    });

    // Station Dropdown
    const stationSelect = document.getElementById("stationSelect");
    if (stationSelect) {
      stationSelect.addEventListener("change", (e) => {
        currentStationId = e.target.value;
        loadStationForecast(currentStationId);
        panMapToStation(currentStationId);
      });
    }

    // Force Refresh Button
    const btnForceRefresh = document.getElementById("btnForceRefresh");
    if (btnForceRefresh) {
      btnForceRefresh.addEventListener("click", () => {
        btnForceRefresh.classList.add("loading");
        btnForceRefresh.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Fetching...';
        loadStationForecast(currentStationId, true).finally(() => {
          btnForceRefresh.classList.remove("loading");
          btnForceRefresh.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> <span>Live Sync</span>';
        });
      });
    }
  }

  // -------------------------------------------------------------
  // 2. Leaflet World & Regional Cryosphere GIS Map Setup
  // -------------------------------------------------------------
  function initLeafletMap() {
    const mapEl = document.getElementById("himalayanMap");
    if (!mapEl) return;

    // Centered on Hindu Kush Himalaya with full global zoom capability (minZoom 2)
    mapInstance = L.map("himalayanMap", {
      center: [28.8, 83.5],
      zoom: 6,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: true,
      worldCopyJump: true
    });

    // Topographic Basemap with mountain terrain and relief shading (free, no API key required)
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
      attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a> | GloFAS Cryosphere Hydrology',
      minZoom: 2,
      maxZoom: 18
    }).addTo(mapInstance);

    // Initialize Layer Groups
    riversLayerGroup = L.layerGroup().addTo(mapInstance);
    glaciersLayerGroup = L.layerGroup().addTo(mapInstance);
    stationsLayerGroup = L.layerGroup().addTo(mapInstance);
    downstreamLayerGroup = L.layerGroup().addTo(mapInstance);

    // Render GIS Vectors
    renderRiversLayer();
    renderGlaciersLayer();
    renderStationsLayer();

    // Map Quick View Controls
    const btnWorld = document.getElementById("btnZoomWorld");
    const btnHima = document.getElementById("btnZoomHimalayas");

    if (btnWorld) {
      btnWorld.addEventListener("click", () => {
        btnWorld.classList.add("active");
        if (btnHima) btnHima.classList.remove("active");
        mapInstance.flyTo([22.0, 40.0], 2, { duration: 1.5 });
      });
    }

    if (btnHima) {
      btnHima.addEventListener("click", () => {
        btnHima.classList.add("active");
        if (btnWorld) btnWorld.classList.remove("active");
        mapInstance.flyTo([28.8, 83.5], 6, { duration: 1.5 });
      });
    }

    // Layer Toggle Checkboxes
    const chkRivers = document.getElementById("chkToggleRivers");
    if (chkRivers) {
      chkRivers.addEventListener("change", (e) => {
        if (e.target.checked) mapInstance.addLayer(riversLayerGroup);
        else mapInstance.removeLayer(riversLayerGroup);
      });
    }

    const chkGlaciers = document.getElementById("chkToggleGlaciers");
    if (chkGlaciers) {
      chkGlaciers.addEventListener("change", (e) => {
        if (e.target.checked) mapInstance.addLayer(glaciersLayerGroup);
        else mapInstance.removeLayer(glaciersLayerGroup);
      });
    }

    const chkStations = document.getElementById("chkToggleStations");
    if (chkStations) {
      chkStations.addEventListener("change", (e) => {
        if (e.target.checked) mapInstance.addLayer(stationsLayerGroup);
        else mapInstance.removeLayer(stationsLayerGroup);
      });
    }

    const chkDownstream = document.getElementById("chkToggleDownstream");
    if (chkDownstream) {
      chkDownstream.addEventListener("change", (e) => {
        if (e.target.checked) mapInstance.addLayer(downstreamLayerGroup);
        else mapInstance.removeLayer(downstreamLayerGroup);
      });
    }

    // Expose selectStation to window for popup clicks
    window.selectStation = (stationId) => {
      currentStationId = stationId;
      const select = document.getElementById("stationSelect");
      if (select) select.value = stationId;
      loadStationForecast(stationId);
      panMapToStation(stationId);
    };
  }

  // -------------------------------------------------------------
  // Render Highlighted Rivers
  // -------------------------------------------------------------
  function renderRiversLayer() {
    if (!riversLayerGroup) return;
    riversLayerGroup.clearLayers();

    MAJOR_RIVERS.forEach(river => {
      // Background glow polyline
      const glowLine = L.polyline(river.coords, {
        color: "#38BDF8",
        weight: 6,
        opacity: 0.35,
        lineCap: "round",
        lineJoin: "round"
      });
      riversLayerGroup.addLayer(glowLine);

      // Primary river stroke
      const riverLine = L.polyline(river.coords, {
        color: "#0284C7",
        weight: 3.5,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round"
      });

      // Interactive hover tooltip
      riverLine.bindTooltip(`🌊 <strong>${river.name}</strong><br><span style="font-size:10px; color:#94A3B8;">${river.system}</span>`, {
        sticky: true,
        className: "river-tooltip"
      });

      // Hover emphasis
      riverLine.on("mouseover", () => {
        riverLine.setStyle({ weight: 5.5, color: "#0369A1", opacity: 1.0 });
        glowLine.setStyle({ weight: 9, opacity: 0.6 });
      });

      riverLine.on("mouseout", () => {
        riverLine.setStyle({ weight: 3.5, color: "#0284C7", opacity: 0.95 });
        glowLine.setStyle({ weight: 6, opacity: 0.35 });
      });

      // Rich river details popup
      riverLine.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; font-size: 12px; color: #0F172A; min-width: 230px; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 16px;">🌊</span>
            <strong style="font-size: 14px; color: #0284C7;">${river.name}</strong>
          </div>
          <div style="font-size: 11px; color: #64748B; margin-bottom: 8px;"><strong>Basin:</strong> ${river.system}</div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px; font-size: 11px; line-height: 1.5; margin-bottom: 8px;">
            <div><strong>Source:</strong> ${river.sourceGlacier}</div>
            <div><strong>Flow Velocity:</strong> ${river.velocity}</div>
            <div><strong>Peak Monitored Surge:</strong> ${river.peakSurge}</div>
            <div><strong>Risk Profile:</strong> <span style="color: #DC2626; font-weight: 600;">${river.risk}</span></div>
          </div>
          <p style="font-size: 11px; color: #334155; margin: 0;">${river.desc}</p>
        </div>
      `);

      riversLayerGroup.addLayer(riverLine);
    });
  }

  // -------------------------------------------------------------
  // Render Highlighted Glaciers & Proglacial Lakes
  // -------------------------------------------------------------
  function renderGlaciersLayer() {
    if (!glaciersLayerGroup) return;
    glaciersLayerGroup.clearLayers();

    MAJOR_GLACIERS.forEach(glacier => {
      const glacierIcon = L.divIcon({
        className: "glacier-map-pin",
        html: `<div class="glacier-pin-inner" title="${glacier.name}"><i class="fa-solid fa-snowflake"></i></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([glacier.lat, glacier.lon], { icon: glacierIcon });

      marker.bindTooltip(`❄️ <strong>${glacier.name}</strong> (${glacier.range})`, {
        direction: "top",
        offset: [0, -10],
        className: "river-tooltip"
      });

      marker.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; font-size: 12px; color: #0F172A; min-width: 240px; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 16px;">❄️</span>
            <strong style="font-size: 14px; color: #0891B2;">${glacier.name}</strong>
          </div>
          <div style="font-size: 11px; color: #64748B; margin-bottom: 8px;"><strong>Range:</strong> ${glacier.range} (${glacier.country})</div>
          <div style="background: #ECFEFF; border: 1px solid #CFFAFE; border-radius: 6px; padding: 8px; font-size: 11px; line-height: 1.5; margin-bottom: 8px;">
            <div><strong>Elevation:</strong> ${glacier.elevation}</div>
            <div><strong>Dimensions:</strong> ${glacier.dimension}</div>
            <div><strong>Retreat Dynamic:</strong> <span style="color: #0284C7; font-weight: 600;">${glacier.retreatRate}</span></div>
            <div><strong>Hazard:</strong> <span style="color: ${glacier.hazardColor}; font-weight: 700;">${glacier.hazard}</span></div>
          </div>
          <p style="font-size: 11px; color: #334155; margin: 0 0 8px 0;">${glacier.details}</p>
          ${glacier.linkedStation ? `<button onclick="window.selectStation('${glacier.linkedStation}')" style="background: #0284C7; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; width: 100%;">Inspect Basin Telemetry</button>` : ''}
        </div>
      `);

      glaciersLayerGroup.addLayer(marker);
    });
  }

  // -------------------------------------------------------------
  // Render Forecast Stations Layer
  // -------------------------------------------------------------
  function renderStationsLayer() {
    if (!stationsLayerGroup) return;
    stationsLayerGroup.clearLayers();
    mapMarkers = {};

    Object.keys(STATIONS_GEO).forEach(key => {
      const st = STATIONS_GEO[key];
      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background-color: ${st.type === 'glof' ? '#EF4444' : (st.type === 'avulsion' ? '#38BDF8' : '#F59E0B')}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marker = L.marker([st.lat, st.lon], { icon: customIcon });
      marker.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; font-size: 12px; color: #0F172A; padding: 4px;">
          <strong style="font-size: 13px; color: #0284C7;">${st.name}</strong><br/>
          <span><strong>Risk:</strong> ${st.hazard}</span><br/>
          <span><strong>Coords:</strong> ${st.lat}° N, ${st.lon}° E</span><br/>
          <button onclick="window.selectStation('${key}')" style="margin-top: 6px; background: #0284C7; color: #fff; border: none; padding: 4px 10px; border-radius: 4px; font-weight: 600; cursor: pointer;">
            Load Telemetry
          </button>
        </div>
      `);
      stationsLayerGroup.addLayer(marker);
      mapMarkers[key] = marker;
    });
  }

  function panMapToStation(stationId) {
    if (!mapInstance || !STATIONS_GEO[stationId]) return;
    const st = STATIONS_GEO[stationId];
    mapInstance.flyTo([st.lat, st.lon], 8, { duration: 1.2 });
    if (mapMarkers[stationId]) {
      mapMarkers[stationId].openPopup();
    }
  }

  // -------------------------------------------------------------
  // 3. Station Forecast & ML Execution
  // -------------------------------------------------------------
  async function loadStationForecast(stationId, forceRefresh = false) {
    try {
      const url = `/api/forecast?station_id=${stationId}&force_refresh=${forceRefresh}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      renderDashboard(data);
    } catch (err) {
      console.error("Forecast fetch error:", err);
      showNotification("Error loading hydrological data: " + err.message, "error");
    }
  }

  function renderDashboard(data) {
    window._lastForecastData = data; // expose for Live Prediction auto-fill
    const station = data.station;
    const status = data.current_status;
    const metrics = data.metrics;
    const timeline = data.timeline;

    // Station Meta Bar
    document.getElementById("basinName").textContent = station.name;
    document.getElementById("basinCoords").textContent = `${station.lat.toFixed(2)}° N, ${station.lon.toFixed(2)}° E`;
    document.getElementById("basinHazard").textContent = station.risk_type;
    document.getElementById("basinDate").textContent = status.latest_date;

    // KPI Numbers
    document.getElementById("kpiCurrentQ").textContent = status.current_discharge_m3s.toFixed(1);
    document.getElementById("kpiPredQ").textContent = status.forecast_tomorrow_m3s.toFixed(1);
    
    // Discharge delta calculation
    const deltaQ = status.forecast_tomorrow_m3s - status.current_discharge_m3s;
    const deltaPct = ((deltaQ / Math.max(0.1, status.current_discharge_m3s)) * 100).toFixed(1);
    const deltaBadge = document.getElementById("kpiQDelta");
    deltaBadge.textContent = `${deltaQ >= 0 ? '+' : ''}${deltaQ.toFixed(1)} m³/s (${deltaPct}%)`;
    deltaBadge.style.color = deltaQ >= 0 ? '#38BDF8' : '#94A3B8';

    // Alert Tier Badge
    const alertBadge = document.getElementById("kpiAlertBadge");
    const alertDesc = document.getElementById("kpiAlertDesc");
    const alertCard = document.getElementById("kpiAlertCard");
    const alertIcon = document.getElementById("kpiAlertIcon");

    alertBadge.textContent = status.alert_tier;
    alertBadge.style.color = status.alert_color;
    alertBadge.style.borderColor = status.alert_color;
    alertBadge.style.backgroundColor = `${status.alert_color}22`;
    alertDesc.textContent = status.alert_desc;

    if (status.alert_tier.includes("EMERGENCY") || status.alert_tier.includes("CRITICAL")) {
      alertCard.style.background = `radial-gradient(circle at top right, rgba(239, 68, 68, 0.25), var(--bg-card))`;
      alertCard.style.borderColor = "#EF4444";
      alertIcon.style.color = "#EF4444";
    } else if (status.alert_tier.includes("WARNING")) {
      alertCard.style.background = `radial-gradient(circle at top right, rgba(249, 115, 22, 0.2), var(--bg-card))`;
      alertCard.style.borderColor = "#F97316";
      alertIcon.style.color = "#F97316";
    } else {
      alertCard.style.background = `radial-gradient(circle at top right, rgba(16, 185, 129, 0.15), var(--bg-card))`;
      alertCard.style.borderColor = "rgba(16, 185, 129, 0.3)";
      alertIcon.style.color = "#10B981";
    }

    // Probability & Cryosphere
    document.getElementById("kpiProb").textContent = status.flood_probability_pct.toFixed(1);
    document.getElementById("kpiMelt").textContent = status.degree_day_melt.toFixed(1);
    document.getElementById("kpiTempSubtitle").textContent = `Temp: ${status.temp_c}°C | Rain: ${status.precip_mm}mm`;

    // Benchmark Table
    const reg = metrics.regression;
    document.getElementById("baseMAE").textContent = reg.persistence.mae;
    document.getElementById("baseRMSE").textContent = reg.persistence.rmse;
    document.getElementById("baseR2").textContent = reg.persistence.r2;

    document.getElementById("rfMAE").textContent = reg.random_forest.mae;
    document.getElementById("rfRMSE").textContent = reg.random_forest.rmse;
    document.getElementById("rfR2").textContent = reg.random_forest.r2;

    document.getElementById("gbMAE").textContent = reg.gradient_boosting.mae;
    document.getElementById("gbRMSE").textContent = reg.gradient_boosting.rmse;
    document.getElementById("gbR2").textContent = reg.gradient_boosting.r2;

    const impPct = reg.improvement_pct_over_baseline;
    const chip = document.getElementById("chipImprovement");
    chip.textContent = `${impPct >= 0 ? '+' : ''}${impPct}% vs Baseline`;
    chip.className = `card-chip ${impPct >= 0 ? 'chip-success' : 'chip-amber'}`;

    // Classification Strip
    const cls = metrics.classification.random_forest;
    document.getElementById("clsPrecision").textContent = cls.precision;
    document.getElementById("clsRecall").textContent = cls.recall;
    document.getElementById("clsF1").textContent = cls.f1;
    document.getElementById("clsFAR").textContent = cls.false_alarm_ratio;

    // Confusion Matrix
    const cm = cls.confusion_matrix;
    document.getElementById("cmTP").textContent = cm.tp;
    document.getElementById("cmFP").textContent = cm.fp;
    document.getElementById("cmFN").textContent = cm.fn;
    document.getElementById("cmTN").textContent = cm.tn;

    // Threshold Label
    document.getElementById("lblThresholdVal").textContent = `${status.flood_threshold_m3s} m³/s`;

    // Render Charts
    renderHydrographChart(timeline, status.flood_threshold_m3s);
    renderFeatureImportanceChart(data.feature_importances);

    // Unique Visualizations: Speedometer Gauge, Vitals, Season Profile, Heatmap, Downstream Cascade
    updateGauge(status.flood_probability_pct);
    updateVitals(status, station.name);
    renderMonthlyRiskBars(timeline);
    renderFloodCalendarHeatmap(timeline);
    updateDownstreamImpactAlert(currentStationId, status);

    // Sync simulator base values
    const sliderBaseQ = document.getElementById("sliderBaseQ");
    if (sliderBaseQ) {
      sliderBaseQ.value = Math.max(5, Math.min(200, Math.round(status.current_discharge_m3s)));
      document.getElementById("valBaseQ").textContent = `${sliderBaseQ.value} m³/s`;
      runSimulationUpdate();
    }
  }

  // -------------------------------------------------------------
  // 4. Chart.js Hydrograph Multi-Axis Rendering
  // -------------------------------------------------------------
  function renderHydrographChart(timeline, threshold) {
    const ctx = document.getElementById("hydrographChart");
    if (!ctx) return;

    if (hydroChartInstance) {
      hydroChartInstance.destroy();
    }

    const labels = timeline.map(t => t.date);
    const actualQ = timeline.map(t => t.actual_q);
    const predQ = timeline.map(t => t.predicted_q);
    const precip = timeline.map(t => t.precip);
    const thresholdLine = timeline.map(() => threshold);

    const tc = getThemeColors();

    hydroChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Actual Discharge (m³/s)",
            data: actualQ,
            borderColor: tc.primary,
            backgroundColor: tc.primaryBg,
            borderWidth: 2,
            fill: true,
            tension: 0.1,
            pointRadius: 0,
            yAxisID: "y"
          },
          {
            label: "RF Predicted Discharge (m³/s)",
            data: predQ,
            borderColor: "#A855F7",
            borderWidth: 1.8,
            borderDash: [3, 3],
            fill: false,
            tension: 0.1,
            pointRadius: 0,
            yAxisID: "y"
          },
          {
            label: "Flood Threshold (90th Pct)",
            data: thresholdLine,
            borderColor: "#EF4444",
            borderWidth: 1.5,
            borderDash: [6, 4],
            fill: false,
            pointRadius: 0,
            yAxisID: "y"
          },
          {
            label: "Daily Rainfall (mm)",
            data: precip,
            type: "bar",
            backgroundColor: tc.isLight ? "rgba(2, 132, 199, 0.45)" : "rgba(2, 132, 199, 0.35)",
            yAxisID: "y1"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: tc.tickColor,
              font: { family: "Inter", size: 11 }
            }
          },
          tooltip: {
            backgroundColor: tc.tooltipBg,
            borderColor: tc.tooltipBorder,
            borderWidth: 1,
            titleColor: tc.tooltipTitle,
            bodyColor: tc.tooltipBody,
            titleFont: { family: "Outfit", size: 13 },
            bodyFont: { family: "JetBrains Mono", size: 12 }
          }
        },
        scales: {
          x: {
            grid: { color: tc.gridColor },
            ticks: {
              color: tc.dimColor,
              font: { family: "Inter", size: 10 },
              maxTicksLimit: 12
            }
          },
          y: {
            type: "linear",
            position: "left",
            grid: { color: tc.gridColor },
            ticks: { color: tc.primary, font: { family: "JetBrains Mono", size: 11 } },
            title: { display: true, text: "River Discharge (m³/s)", color: tc.tickColor }
          },
          y1: {
            type: "linear",
            position: "right",
            grid: { drawOnChartArea: false },
            ticks: { color: "#60A5FA", font: { family: "JetBrains Mono", size: 10 } },
            title: { display: true, text: "Precipitation (mm)", color: "#60A5FA" },
            min: 0,
            max: Math.max(...precip, 30) * 3
          }
        }
      }
    });
  }

  // -------------------------------------------------------------
  // 5. Feature Importance Chart
  // -------------------------------------------------------------
  function renderFeatureImportanceChart(features) {
    const ctx = document.getElementById("featureImpChart");
    if (!ctx) return;

    if (featureChartInstance) {
      featureChartInstance.destroy();
    }

    const topFeatures = features.slice(0, 6);
    const labels = topFeatures.map(f => f.readable);
    const values = topFeatures.map(f => (f.importance * 100).toFixed(1));
    const tc = getThemeColors();

    featureChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Importance (%)",
          data: values,
          backgroundColor: tc.barPalette,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tc.tooltipBg,
            borderColor: tc.tooltipBorder,
            borderWidth: 1,
            titleColor: tc.tooltipTitle,
            bodyColor: tc.tooltipBody
          }
        },
        scales: {
          x: {
            grid: { color: tc.gridColor },
            ticks: { color: tc.dimColor, font: { family: "JetBrains Mono", size: 10 } }
          },
          y: {
            grid: { display: false },
            ticks: { color: tc.yTickColor, font: { family: "Inter", size: 11, weight: "500" } }
          }
        }
      }
    });
  }

  // -------------------------------------------------------------
  // 6. "What-If" Climate Simulator
  // -------------------------------------------------------------
  function initSimulatorControls() {
    const sTemp = document.getElementById("sliderTempAnomaly");
    const sCloud = document.getElementById("sliderCloudburst");
    const sAnte = document.getElementById("sliderAntecedent");
    const sBase = document.getElementById("sliderBaseQ");
    const btnReset = document.getElementById("btnResetSim");

    const updateSliderUI = () => {
      document.getElementById("valTempAnomaly").textContent = `${parseFloat(sTemp.value) >= 0 ? '+' : ''}${sTemp.value} °C`;
      document.getElementById("valCloudburst").textContent = `${sCloud.value} mm`;
      document.getElementById("valAntecedent").textContent = `${sAnte.value} mm`;
      document.getElementById("valBaseQ").textContent = `${sBase.value} m³/s`;
    };

    [sTemp, sCloud, sAnte, sBase].forEach(slider => {
      slider.addEventListener("input", () => {
        updateSliderUI();
        clearTimeout(simDebounceTimer);
        simDebounceTimer = setTimeout(runSimulationUpdate, 100);
      });
    });

    if (btnReset) {
      btnReset.addEventListener("click", () => {
        sTemp.value = 3.5;
        sCloud.value = 75;
        sAnte.value = 30;
        sBase.value = 45;
        updateSliderUI();
        runSimulationUpdate();
      });
    }
  }

  async function runSimulationUpdate() {
    const tempAnomaly = parseFloat(document.getElementById("sliderTempAnomaly").value);
    const cloudburst = parseFloat(document.getElementById("sliderCloudburst").value);
    const antecedent = parseFloat(document.getElementById("sliderAntecedent").value);
    const baseQ = parseFloat(document.getElementById("sliderBaseQ").value);

    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_discharge: baseQ,
          temp_anomaly: tempAnomaly,
          cloudburst_rain_mm: cloudburst,
          antecedent_rain_3d: antecedent,
          current_temp: 12.0,
          threshold_90: 80.0
        })
      });

      if (!res.ok) throw new Error("Simulation failed");
      const out = await res.json();

      // Update UI outputs
      document.getElementById("simBaseVal").textContent = out.base_discharge_m3s.toFixed(1);
      document.getElementById("simPeakVal").textContent = out.predicted_discharge_24h_m3s.toFixed(1);
      document.getElementById("simDeltaVal").textContent = `+${out.surge_magnitude_m3s.toFixed(1)}`;
      document.getElementById("simPctVal").textContent = `+${out.percentage_increase.toFixed(0)}%`;

      const badge = document.getElementById("simAlertBadge");
      badge.textContent = out.alert_tier;
      badge.style.color = out.alert_color;
      badge.style.borderColor = out.alert_color;
      badge.style.backgroundColor = `${out.alert_color}22`;

      // Partitioning Bars
      const bd = out.runoff_breakdown;
      const bRain = document.getElementById("barRain");
      const bMelt = document.getElementById("barMelt");
      const bCoupling = document.getElementById("barCoupling");

      bRain.style.width = `${bd.direct_rainfall_pct}%`;
      bRain.textContent = `${bd.direct_rainfall_pct}% Rain`;
      bMelt.style.width = `${bd.glacier_snowmelt_pct}%`;
      bMelt.textContent = `${bd.glacier_snowmelt_pct}% Melt`;
      bCoupling.style.width = `${bd.rain_on_snow_thermal_coupling_pct}%`;
      bCoupling.textContent = `${bd.rain_on_snow_thermal_coupling_pct}%`;

      // Action text
      document.getElementById("simActionText").textContent = out.recommended_action;
      const actionCard = document.getElementById("simActionCard");
      actionCard.style.borderColor = out.alert_color;
      actionCard.style.backgroundColor = `${out.alert_color}18`;

    } catch (err) {
      console.error("Simulation error:", err);
    }
  }

  // -------------------------------------------------------------
  // 7. Disaster Forensic Backtesting
  // -------------------------------------------------------------
  async function loadHistoricalDisasters() {
    const grid = document.getElementById("disastersGrid");
    if (!grid) return;

    try {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error("Failed to load backtests");
      const data = await res.json();
      renderDisasterCards(data.events);
    } catch (err) {
      console.error("Disasters load error:", err);
      grid.innerHTML = `<div class="error-msg">Failed to load historical disasters: ${err.message}</div>`;
    }
  }

  function renderDisasterCards(events) {
    const grid = document.getElementById("disastersGrid");
    grid.innerHTML = "";

    events.forEach(ev => {
      const card = document.createElement("div");
      card.className = "disaster-card";

      let verdictClass = "verdict-flagged";
      if (ev.verdict.includes("MISSED")) verdictClass = "verdict-missed";
      else if (ev.verdict.includes("PARTIAL") || ev.verdict.includes("MARGINAL")) verdictClass = "verdict-partial";

      card.innerHTML = `
        <div class="disaster-top">
          <div>
            <span class="disaster-name">${ev.name}</span>
            <span class="disaster-meta-tag"><i class="fa-solid fa-calendar-day"></i> ${ev.date} • <i class="fa-solid fa-location-dot"></i> ${ev.location}</span>
          </div>
          <span class="verdict-badge ${verdictClass}">${ev.verdict}</span>
        </div>
        <div class="disaster-body">
          <p class="disaster-impact"><strong>Historical Impact:</strong> ${ev.historical_impact}</p>
          <div class="scientific-verdict-box">
            <strong>Scientific Post-Mortem & Model Mechanics:</strong>
            ${ev.scientific_analysis}
          </div>
        </div>
        <div class="disaster-footer">
          <span>Hazard Type: <strong>${ev.type}</strong></span>
          <span>Window Peak Flow: <strong>${ev.max_discharge_in_window_m3s || '--'} m³/s</strong></span>
        </div>
      `;
      grid.appendChild(card);
    });

    const btnBacktest = document.getElementById("btnRunBacktests");
    if (btnBacktest) {
      btnBacktest.addEventListener("click", () => {
        btnBacktest.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Running Full Walk-Forward...';
        loadHistoricalDisasters().finally(() => {
          btnBacktest.innerHTML = '<i class="fa-solid fa-check"></i> Walk-Forward Completed';
          setTimeout(() => {
            btnBacktest.innerHTML = '<i class="fa-solid fa-play"></i> Run Walk-Forward Backtest';
          }, 3000);
        });
      });
    }
  }

  // -------------------------------------------------------------
  // 8. Scientific Report Renderer
  // -------------------------------------------------------------
  async function loadScientificReport() {
    const reportBody = document.getElementById("reportBody");
    if (!reportBody) return;

    try {
      const res = await fetch("/api/report");
      if (!res.ok) throw new Error("Report fetch failed");
      const report = await res.json();

      document.getElementById("reportTitle").textContent = report.title;
      document.getElementById("reportAuthors").textContent = `${report.authors} • Version ${report.version}`;

      let html = `
        <div class="report-abstract-box">
          <strong>Abstract & Cryospheric Executive Summary:</strong>
          <p>${report.abstract}</p>
        </div>
      `;

      report.sections.forEach(sec => {
        // Convert markdown bold and lists to HTML
        let formattedContent = sec.content
          .replace(/\n\n/g, "</p><p>")
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>");

        html += `
          <div class="report-section" id="${sec.id}">
            <h3>${sec.heading}</h3>
            <p>${formattedContent}</p>
          </div>
        `;
      });

      reportBody.innerHTML = html;

    } catch (err) {
      console.error("Report render error:", err);
      reportBody.innerHTML = `<div class="error-msg">Error loading scientific report: ${err.message}</div>`;
    }
  }

  // -------------------------------------------------------------
  // 9. Custom Coordinates Modal
  // -------------------------------------------------------------
  function initCustomCoordsModal() {
    const modal = document.getElementById("customCoordModal");
    const btnOpen = document.getElementById("btnCustomCoords");
    const btnClose = document.getElementById("btnCloseModal");
    const btnApply = document.getElementById("btnApplyCustomCoords");

    if (!modal || !btnOpen) return;

    btnOpen.addEventListener("click", () => modal.style.display = "flex");
    btnClose.addEventListener("click", () => modal.style.display = "none");
    window.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });

    btnApply.addEventListener("click", async () => {
      const lat = parseFloat(document.getElementById("customLat").value);
      const lon = parseFloat(document.getElementById("customLon").value);
      const start = document.getElementById("customStart").value;
      const end = document.getElementById("customEnd").value;
      const thr = parseFloat(document.getElementById("customThreshold").value);

      btnApply.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Fetching & Training...';
      try {
        const url = `/api/forecast?lat=${lat}&lon=${lon}&start_date=${start}&end_date=${end}&threshold_pct=${thr}&force_refresh=true`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Custom fetch failed");
        const data = await res.json();
        renderDashboard(data);
        modal.style.display = "none";

        // Add custom marker to map
        if (mapInstance) {
          mapInstance.flyTo([lat, lon], 9);
          L.marker([lat, lon]).addTo(mapInstance)
            .bindPopup(`<strong>Custom Coordinates:</strong><br/>${lat}° N, ${lon}° E`)
            .openPopup();
        }
      } catch (err) {
        alert("Failed to fetch custom coordinates: " + err.message);
      } finally {
        btnApply.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Fetch & Train Model';
      }
    });
  }

  function showNotification(msg, type = "info") {
    console.log(`[${type.toUpperCase()}] ${msg}`);
  }

  // -------------------------------------------------------------
  // 7. Live Field Prediction Panel
  // -------------------------------------------------------------
  function initLivePredictionPanel() {
    const btnRun    = document.getElementById("btnRunLivePredict");
    const btnFill   = document.getElementById("btnAutofillToday");
    if (!btnRun) return;

    // Auto-fill: populate all fields from the latest loaded station data
    btnFill && btnFill.addEventListener("click", () => {
      if (!window._lastForecastData) {
        alert("Please load a station first using 'Live Sync'.");
        return;
      }
      const cs = window._lastForecastData.current_status;
      const now = new Date();
      const month = now.getMonth() + 1;
      const doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
      const isMonsoon = [6, 7, 8, 9].includes(month) ? 1 : 0;
      const sinVal = Math.sin(2 * Math.PI * doy / 365.25);
      const cosVal = Math.cos(2 * Math.PI * doy / 365.25);
      const q = cs.current_discharge_m3s;
      const t = cs.temp_c;
      const p = cs.precip_mm;
      const ddm = cs.degree_day_melt;

      setField("pi_discharge", q);
      setField("pi_q_lag1", +(q * 0.97).toFixed(3));
      setField("pi_q_lag2", +(q * 0.93).toFixed(3));
      setField("pi_q_lag3", +(q * 0.90).toFixed(3));
      setField("pi_temp_mean", t);
      setField("pi_temp_3d", +(t - 0.4).toFixed(1));
      setField("pi_temp_warming_anomaly", +(t - (t - 1.8)).toFixed(1));
      setField("pi_degree_day_melt", ddm);
      setField("pi_degree_day_melt_3d", +(ddm * 3).toFixed(1));
      setField("pi_precip", p);
      setField("pi_rain", +(p * 0.8).toFixed(1));
      setField("pi_precip_3d", +(p * 2.6).toFixed(1));
      setField("pi_precip_7d", +(p * 5.5).toFixed(1));
      setField("pi_rain_3d", +(p * 2.0).toFixed(1));
      setField("pi_month", month);
      document.getElementById("pi_is_monsoon").value = isMonsoon;
      btnFill.innerHTML = '<i class="fa-solid fa-circle-check"></i> Auto-filled!';
      setTimeout(() => {
        btnFill.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Auto-fill Latest';
      }, 2000);
    });

    // Month change → auto-update monsoon toggle
    const monthEl = document.getElementById("pi_month");
    if (monthEl) {
      monthEl.addEventListener("input", () => {
        const m = parseInt(monthEl.value);
        document.getElementById("pi_is_monsoon").value = [6, 7, 8, 9].includes(m) ? 1 : 0;
      });
    }

    // Run Prediction button
    btnRun.addEventListener("click", async () => {
      btnRun.classList.add("loading");
      btnRun.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Running ML Engine...';

      try {
        const month = parseInt(getField("pi_month"));
        const now = new Date();
        const doy = 30 * (month - 1) + 15; // approx day of year from month
        const sinVal = parseFloat(Math.sin(2 * Math.PI * doy / 365.25).toFixed(6));
        const cosVal = parseFloat(Math.cos(2 * Math.PI * doy / 365.25).toFixed(6));

        const payload = {
          discharge:              parseFloat(getField("pi_discharge")),
          q_lag1:                 parseFloat(getField("pi_q_lag1")),
          q_lag2:                 parseFloat(getField("pi_q_lag2")),
          q_lag3:                 parseFloat(getField("pi_q_lag3")),
          temp_mean:              parseFloat(getField("pi_temp_mean")),
          precip:                 parseFloat(getField("pi_precip")),
          rain:                   parseFloat(getField("pi_rain")),
          precip_3d:              parseFloat(getField("pi_precip_3d")),
          precip_7d:              parseFloat(getField("pi_precip_7d")),
          rain_3d:                parseFloat(getField("pi_rain_3d")),
          temp_3d:                parseFloat(getField("pi_temp_3d")),
          degree_day_melt:        parseFloat(getField("pi_degree_day_melt")),
          degree_day_melt_3d:     parseFloat(getField("pi_degree_day_melt_3d")),
          temp_warming_anomaly:   parseFloat(getField("pi_temp_warming_anomaly")),
          month:                  month,
          season_sin:             sinVal,
          season_cos:             cosVal,
          is_monsoon:             parseInt(document.getElementById("pi_is_monsoon").value),
          station_id:             currentStationId
        };

        // Validate no NaN
        for (const [k, v] of Object.entries(payload)) {
          if (typeof v === "number" && isNaN(v)) {
            throw new Error(`Invalid value for '${k}'. Please fill all fields.`);
          }
        }

        const res = await fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Prediction API error");
        }

        const result = await res.json();
        renderPredictResult(result);

      } catch (err) {
        const resultBox = document.getElementById("predictResultBox");
        resultBox.style.display = "flex";
        document.getElementById("predDischarge").textContent = "ERR";
        document.getElementById("predProb").textContent = "--";
        document.getElementById("predThreshold").textContent = "--";
        document.getElementById("predAlertTier").textContent = "ERROR";
        document.getElementById("predAlertDesc").textContent = err.message;
        document.getElementById("predAlertBox").style.borderColor = "#94A3B8";
        document.getElementById("predAlertBox").style.color = "#94A3B8";
        document.getElementById("predAlertIcon").className = "fa-solid fa-circle-xmark pred-alert-icon";
      } finally {
        btnRun.classList.remove("loading");
        btnRun.innerHTML = '<i class="fa-solid fa-microchip"></i> Run ML Flood Prediction';
      }
    });
  }

  function renderPredictResult(r) {
    const box = document.getElementById("predictResultBox");
    box.style.display = "flex";

    // Scroll to results
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });

    // Fill values
    document.getElementById("predDischarge").textContent = r.predicted_discharge_m3s.toFixed(3);
    document.getElementById("predProb").textContent = r.flood_probability_pct.toFixed(1) + "%";
    document.getElementById("predThreshold").textContent = r.flood_threshold_m3s.toFixed(3);

    // Animated probability bar
    setTimeout(() => {
      document.getElementById("probBarFill").style.width = Math.min(r.flood_probability_pct, 100) + "%";
    }, 100);

    // Alert box
    const alertBox  = document.getElementById("predAlertBox");
    const alertIcon = document.getElementById("predAlertIcon");
    const alertName = document.getElementById("predAlertTier");
    const alertDesc = document.getElementById("predAlertDesc");

    alertBox.style.borderColor = r.alert_color;
    alertBox.style.color = r.alert_color;
    alertIcon.className = `fa-solid fa-${r.alert_icon} pred-alert-icon`;
    alertIcon.style.color = r.alert_color;
    alertName.textContent = r.alert_tier;
    alertName.style.color = r.alert_color;
    alertDesc.textContent = r.alert_desc;
    alertDesc.style.color = "";
  }

  function getField(id) {
    const el = document.getElementById(id);
    return el ? el.value : "0";
  }

  function setField(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  // Initialize prediction panel
  initLivePredictionPanel();

  // -------------------------------------------------------------
  // UNIQUE FEATURE 1: ANIMATED RISK SPEEDOMETER GAUGE
  // -------------------------------------------------------------
  function updateGauge(prob) {
    const valText = document.getElementById("gaugeValueText");
    const needle = document.getElementById("gaugeNeedle");
    const fillArc = document.getElementById("gaugeActiveFill");
    const chip = document.getElementById("gaugeAlertChip");
    if (!valText || !needle) return;

    const p = Math.max(0, Math.min(100, Math.round(prob || 0)));
    valText.textContent = `${p}%`;

    // Needle rotation (0% -> 0deg, 100% -> 180deg)
    needle.style.transform = `rotate(${p * 1.8}deg)`;

    let color = "#10B981";
    let tier = "SAFE";
    let chipCls = "chip-success";

    if (p >= 75) {
      color = "#EF4444";
      tier = "CRITICAL";
      chipCls = "chip-danger";
    } else if (p >= 50) {
      color = "#F97316";
      tier = "WARNING";
      chipCls = "chip-amber";
    } else if (p >= 30) {
      color = "#F59E0B";
      tier = "WATCH";
      chipCls = "chip-amber";
    }

    if (chip) {
      chip.textContent = tier;
      chip.className = `card-chip ${chipCls}`;
    }

    if (fillArc) {
      fillArc.style.stroke = color;
      const rad = (Math.PI * (180 - p * 1.8)) / 180;
      const x = 100 - 80 * Math.cos(rad);
      const y = 100 - 80 * Math.sin(rad);
      const largeArc = (p * 1.8 > 180) ? 1 : 0;
      fillArc.setAttribute("d", `M 20 100 A 80 80 0 ${largeArc} 1 ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
  }

  // -------------------------------------------------------------
  // UNIQUE FEATURE 2: CRYOSPHERE VITALS MONITOR
  // -------------------------------------------------------------
  function updateVitals(status, stationName) {
    if (!status) return;

    // Discharge
    const qPct = Math.min(100, Math.round((status.current_discharge_m3s / Math.max(status.flood_threshold_m3s * 1.2, 1)) * 100));
    const bQ = document.getElementById("vitalBarQ");
    const vQ = document.getElementById("vitalValQ");
    if (bQ) bQ.style.width = `${qPct}%`;
    if (vQ) vQ.textContent = `${status.current_discharge_m3s.toFixed(1)} m³/s`;

    // Temperature
    const tPct = Math.min(100, Math.max(0, Math.round(((status.current_temp_c + 15) / 45) * 100)));
    const bT = document.getElementById("vitalBarT");
    const vT = document.getElementById("vitalValT");
    if (bT) bT.style.width = `${tPct}%`;
    if (vT) vT.textContent = `${status.current_temp_c.toFixed(1)} °C`;

    // Precipitation
    const pPct = Math.min(100, Math.round((status.current_precip_mm / 60) * 100));
    const bP = document.getElementById("vitalBarP");
    const vP = document.getElementById("vitalValP");
    if (bP) bP.style.width = `${pPct}%`;
    if (vP) vP.textContent = `${status.current_precip_mm.toFixed(1)} mm`;

    // Glacier Melt
    const mPct = Math.min(100, Math.round((status.degree_day_melt / 20) * 100));
    const bM = document.getElementById("vitalBarM");
    const vM = document.getElementById("vitalValM");
    if (bM) bM.style.width = `${mPct}%`;
    if (vM) vM.textContent = `${status.degree_day_melt.toFixed(1)} °C·d`;

    // Flood Risk
    const rPct = Math.min(100, Math.round(status.flood_probability_pct));
    const bR = document.getElementById("vitalBarRisk");
    const vR = document.getElementById("vitalValRisk");
    if (bR) bR.style.width = `${rPct}%`;
    if (vR) vR.textContent = `${rPct}%`;

    const note = document.getElementById("vitalsStationNote");
    if (note) note.innerHTML = `<i class="fa-solid fa-location-dot"></i> Telemetry Basin: <strong>${stationName || 'Himalayan Station'}</strong>`;
  }

  // -------------------------------------------------------------
  // UNIQUE FEATURE 3: MONTHLY FLOOD RISK PROFILE
  // -------------------------------------------------------------
  function renderMonthlyRiskBars(timeline) {
    const container = document.getElementById("monthRiskBars");
    if (!container || !timeline || !timeline.length) return;

    const monthSums = Array(12).fill(0);
    const monthCounts = Array(12).fill(0);

    timeline.forEach(item => {
      const d = new Date(item.date);
      const m = d.getMonth();
      monthSums[m] += (item.flood_prob || (item.flood_actual ? 1 : 0));
      monthCounts[m]++;
    });

    const monthAvgs = monthSums.map((sum, i) => monthCounts[i] ? (sum / monthCounts[i]) : 0);
    const maxVal = Math.max(...monthAvgs, 0.05);

    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    container.innerHTML = monthAvgs.map((avg, i) => {
      const heightPct = Math.max(8, Math.min(100, Math.round((avg / maxVal) * 100)));
      const isMonsoonPeak = (i >= 5 && i <= 8);
      const barCls = isMonsoonPeak ? "mb-bar peak" : "mb-bar";
      return `
        <div class="mb-col" title="${monthNames[i]}: Avg Flood Probability ${(avg * 100).toFixed(1)}%">
          <div class="${barCls}" style="height:${heightPct}%"></div>
        </div>
      `;
    }).join("");
  }

  // -------------------------------------------------------------
  // UNIQUE FEATURE 4: FLOOD RISK CALENDAR HEATMAP
  // -------------------------------------------------------------
  function renderFloodCalendarHeatmap(timeline) {
    const grid = document.getElementById("floodCalendarHeatmap");
    if (!grid || !timeline || !timeline.length) return;

    const sample = timeline.slice(-364);

    grid.innerHTML = sample.map(item => {
      const prob = item.flood_prob != null ? item.flood_prob : (item.flood_actual ? 1 : 0);
      let cls = "cal-c0";
      if (prob >= 0.70) cls = "cal-c4";
      else if (prob >= 0.45) cls = "cal-c3";
      else if (prob >= 0.20) cls = "cal-c2";
      else if (prob >= 0.05) cls = "cal-c1";

      const tip = `${item.date}: Q=${(item.actual_q || 0).toFixed(0)}m³/s, Risk=${(prob * 100).toFixed(0)}%`;
      return `<div class="cal-day ${cls}" data-tip="${tip}"></div>`;
    }).join("");
  }

  // -------------------------------------------------------------
  // UNIQUE FEATURE 5: DOWNSTREAM GLACIER MELT FLOOD IMPACT ALERT
  // -------------------------------------------------------------
  function updateDownstreamImpactAlert(stationId, status) {
    const basinData = DOWNSTREAM_IMPACT_DATA[stationId] || DOWNSTREAM_IMPACT_DATA["kedarnath"];
    if (!basinData) return;

    window._lastDownstreamStatus = status;

    const surgeMult = currentMeltMultiplier;
    const floodProb = status ? (status.flood_probability_pct || 0) : 0;

    // Update Telemetry Row
    const telBasin = document.getElementById("telBasinName");
    const telSpeed = document.getElementById("telWaveSpeed");
    const telEta = document.getElementById("telFirstEta");
    const telPop = document.getElementById("telPopRisk");

    const effectiveSpeed = Math.round(basinData.baseVelocityKmH * surgeMult);
    const firstTown = basinData.towns[0];
    const firstEtaMin = Math.max(4, Math.round((firstTown.distKm / effectiveSpeed) * 60));

    if (telBasin) telBasin.textContent = `${basinData.basin} (${basinData.river})`;
    if (telSpeed) telSpeed.textContent = `${effectiveSpeed} km/h (${surgeMult > 1.5 ? 'Surge Flood Wave' : 'Mountain Torrent'})`;
    if (telEta) telEta.textContent = `~${firstEtaMin} min (${firstTown.name})`;
    if (telPop) telPop.textContent = basinData.totalPopRisk;

    // Overall Alert Badge
    const badge = document.getElementById("downstreamAlertBadge");
    if (badge) {
      if (floodProb >= 65 || surgeMult >= 2.5) {
        badge.className = "card-chip chip-red";
        badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> CRITICAL INUNDATION CASCADE ALERT`;
      } else if (floodProb >= 35 || surgeMult >= 1.5) {
        badge.className = "card-chip chip-amber";
        badge.innerHTML = `<i class="fa-solid fa-bell"></i> HIGH CASCADE WARNING`;
      } else {
        badge.className = "card-chip chip-success";
        badge.innerHTML = `<i class="fa-solid fa-shield-check"></i> NORMAL RUNOFF WATCH`;
      }
    }

    // Render Table
    renderDownstreamTownsTable(basinData.towns, basinData, surgeMult, floodProb);

    // Render Map Markers & Vector Path
    renderDownstreamMapMarkers(basinData, surgeMult, floodProb);
  }

  function renderDownstreamTownsTable(towns, basinData, surgeMult, floodProb) {
    const tbody = document.getElementById("downstreamTownsTbody");
    if (!tbody) return;

    const effectiveSpeed = basinData.baseVelocityKmH * surgeMult;

    tbody.innerHTML = towns.map(town => {
      const etaMin = Math.max(5, Math.round((town.distKm / effectiveSpeed) * 60));
      const etaStr = etaMin >= 60 ? `${(etaMin / 60).toFixed(1)} hrs` : `${etaMin} min`;

      // Dynamic Risk Elevation based on melt & flood prob
      let riskLevel = town.riskBase;
      if (surgeMult >= 2.5 || floodProb >= 70) {
        if (riskLevel === "High") riskLevel = "Critical";
        else if (riskLevel === "Medium") riskLevel = "High";
        else if (riskLevel === "Watch") riskLevel = "Medium";
      } else if (surgeMult <= 1.0 && floodProb < 20) {
        if (riskLevel === "Critical") riskLevel = "High";
        else if (riskLevel === "High") riskLevel = "Medium";
      }

      let badgeCls = "risk-badge-watch";
      let riskIcon = "fa-eye";
      let rowCls = "";

      if (riskLevel === "Critical") {
        badgeCls = "risk-badge-critical";
        riskIcon = "fa-triangle-exclamation";
        rowCls = "critical-row";
      } else if (riskLevel === "High") {
        badgeCls = "risk-badge-high";
        riskIcon = "fa-radiation";
      } else if (riskLevel === "Medium") {
        badgeCls = "risk-badge-medium";
        riskIcon = "fa-circle-exclamation";
      }

      return `
        <tr class="${rowCls}">
          <td>
            <strong>${town.name}</strong>
            <div style="font-size:0.75rem; color:var(--text-muted)">${basinData.river}</div>
          </td>
          <td><strong>${town.distKm} km</strong></td>
          <td><span class="eta-pill">~${etaStr}</span></td>
          <td><span class="risk-badge ${badgeCls}"><i class="fa-solid ${riskIcon}"></i> ${riskLevel.toUpperCase()}</span></td>
          <td>
            <div><strong>${town.popRisk}</strong></div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px">${town.criticalInfra}</div>
          </td>
          <td><div style="font-size:0.8rem; line-height:1.3">${town.action}</div></td>
          <td>
            <button class="btn-locate-zone" onclick="focusDownstreamZone(${town.lat}, ${town.lon}, 13, '${town.name.replace(/'/g, "")}')">
              <i class="fa-solid fa-location-crosshairs"></i> View
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  function renderDownstreamMapMarkers(basinData, surgeMult, floodProb) {
    if (!downstreamLayerGroup) return;
    downstreamLayerGroup.clearLayers();

    // 1. Draw glowing downstream river vector path
    if (basinData.floodPathCoords && basinData.floodPathCoords.length) {
      // Glow background line
      L.polyline(basinData.floodPathCoords, {
        color: "#EF4444",
        weight: 6,
        opacity: 0.35,
        lineCap: "round"
      }).addTo(downstreamLayerGroup);

      // Core animated dashed line
      L.polyline(basinData.floodPathCoords, {
        color: "#DC2626",
        weight: 3,
        dashArray: "6, 8",
        opacity: 0.95
      }).addTo(downstreamLayerGroup);
    }

    // 2. Plot downstream settlement radar markers
    const effectiveSpeed = basinData.baseVelocityKmH * surgeMult;

    basinData.towns.forEach(town => {
      const etaMin = Math.max(5, Math.round((town.distKm / effectiveSpeed) * 60));
      const etaStr = etaMin >= 60 ? `${(etaMin / 60).toFixed(1)} hrs` : `${etaMin} min`;

      let riskLevel = town.riskBase;
      if (surgeMult >= 2.5 || floodProb >= 70) {
        if (riskLevel === "High") riskLevel = "Critical";
        else if (riskLevel === "Medium") riskLevel = "High";
      }

      let coreCls = "";
      let ringCls = "";
      let riskColor = "#EF4444";

      if (riskLevel === "High") {
        coreCls = "rc-high";
        ringCls = "rr-high";
        riskColor = "#F97316";
      } else if (riskLevel === "Medium" || riskLevel === "Watch") {
        coreCls = "rc-med";
        ringCls = "rr-med";
        riskColor = "#F59E0B";
      }

      const radarHtml = `
        <div class="radar-marker" title="${town.name} (${riskLevel})">
          <div class="radar-ring ${ringCls}"></div>
          <div class="radar-core ${coreCls}"></div>
        </div>
      `;

      const icon = L.divIcon({
        className: "custom-radar-icon",
        html: radarHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([town.lat, town.lon], { icon }).addTo(downstreamLayerGroup);

      const popupHtml = `
        <div style="font-family:'Inter',sans-serif; min-width:220px; color:#0F172A">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px">
            <span style="background:${riskColor}; color:#fff; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px">${riskLevel.toUpperCase()}</span>
            <strong style="font-size:13px">${town.name}</strong>
          </div>
          <div style="font-size:11px; margin-bottom:3px; color:#475569">
            <strong>Distance:</strong> ${town.distKm} km from glacier
          </div>
          <div style="font-size:11px; margin-bottom:3px; color:#DC2626; font-weight:700">
            <strong>Flood Arrival ETA:</strong> ~${etaStr}
          </div>
          <div style="font-size:11px; margin-bottom:6px; color:#475569">
            <strong>At Risk:</strong> ${town.popRisk}
          </div>
          <div style="font-size:11px; background:#F8FAFC; border:1px solid #E2E8F0; padding:6px; border-radius:4px; line-height:1.3; color:#1E293B">
            <strong>Protocol:</strong> ${town.action}
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
    });
  }

  function initDownstreamImpactControls() {
    const btn1 = document.getElementById("btnMeltPreset1");
    const btn2 = document.getElementById("btnMeltPreset2");
    const btn3 = document.getElementById("btnMeltPreset3");
    const slider = document.getElementById("sliderMeltFactor");
    const valText = document.getElementById("valMeltFactor");

    function setMeltMultiplier(val) {
      currentMeltMultiplier = parseFloat(val);
      if (slider) slider.value = currentMeltMultiplier;
      if (valText) valText.textContent = `${currentMeltMultiplier.toFixed(1)}x Surge`;

      [btn1, btn2, btn3].forEach(b => {
        if (b) {
          const m = parseFloat(b.getAttribute("data-mult"));
          b.classList.toggle("active", Math.abs(m - currentMeltMultiplier) < 0.1);
        }
      });

      updateDownstreamImpactAlert(currentStationId, window._lastDownstreamStatus || window._lastForecastData?.status || {});
    }

    if (btn1) btn1.addEventListener("click", () => setMeltMultiplier(1.0));
    if (btn2) btn2.addEventListener("click", () => setMeltMultiplier(1.8));
    if (btn3) btn3.addEventListener("click", () => setMeltMultiplier(3.2));

    if (slider) {
      slider.addEventListener("input", (e) => {
        setMeltMultiplier(e.target.value);
      });
    }
  }

  // Focus map on downstream town
  window.focusDownstreamZone = (lat, lon, zoom, townName) => {
    if (!mapInstance) return;
    mapInstance.flyTo([lat, lon], zoom || 12, { duration: 1.2 });
    const mapCard = document.querySelector(".map-card");
    if (mapCard) {
      mapCard.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Initialize downstream controls
  initDownstreamImpactControls();

});

