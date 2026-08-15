import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const checks = [];

function readSource(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function check(name, passed, details = undefined) {
  checks.push({ name, passed: Boolean(passed), ...(details === undefined ? {} : { details }) });
}

function field(block, key) {
  return block.match(new RegExp(`^\\s*${key}:\\s*'([^']*)'`, 'm'))?.[1];
}

function numberField(block, key) {
  const value = block.match(new RegExp(`^\\s*${key}:\\s*([0-9][0-9_]*(?:\\.[0-9_]+)?)`, 'm'))?.[1];
  return value === undefined ? undefined : Number(value.replaceAll('_', ''));
}

function bodyRecords(source) {
  return source
    .split(/\n  \{\n/)
    .slice(1)
    .map((block) => block.split(/\n  \},/)[0])
    .map((block) => ({
      id: field(block, 'id'),
      nameEn: field(block, 'nameEn'),
      type: field(block, 'type'),
      parentId: field(block, 'parentId'),
      radiusKm: numberField(block, 'radiusKm'),
      semiMajorAxis: numberField(block, 'semiMajorAxis'),
      semiMajorAxisUnit: field(block, 'semiMajorAxisUnit'),
      orbitalPeriodDays: numberField(block, 'orbitalPeriodDays'),
      eccentricity: numberField(block, 'eccentricity'),
      inclinationDeg: numberField(block, 'inclinationDeg'),
    }));
}

const dataSource = readSource('src/data/solarSystemData.ts');
const bodies = bodyRecords(dataSource);
const byId = new Map(bodies.map((body) => [body.id, body]));
const requiredPlanetIds = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const requiredMoonParents = {
  earth: ['moon'],
  mars: ['phobos', 'deimos'],
  jupiter: ['io', 'europa', 'ganymede', 'callisto'],
  saturn: ['mimas', 'enceladus', 'tethys', 'dione', 'rhea', 'titan', 'iapetus'],
  uranus: ['miranda', 'ariel', 'umbriel', 'titania', 'oberon'],
  neptune: ['triton'],
  pluto: ['charon', 'styx', 'nix', 'kerberos', 'hydra'],
};
const requiredIds = ['sun', ...requiredPlanetIds, ...Object.values(requiredMoonParents).flat()];

check('dataset contains the complete required body count', bodies.length === 35, { actual: bodies.length, expected: 35 });
check('dataset contains Sun, all planets, and Pluto', requiredPlanetIds.every((id) => byId.has(id)) && byId.get('sun')?.type === 'star');
check(
  'dataset contains every required major moon under its declared parent',
  Object.entries(requiredMoonParents).every(([parentId, moonIds]) => moonIds.every((moonId) => byId.get(moonId)?.parentId === parentId)),
  Object.fromEntries(Object.entries(requiredMoonParents).map(([parentId, moonIds]) => [parentId, moonIds.filter((moonId) => byId.get(moonId)?.parentId !== parentId)])),
);
check('all required ids are unique and represented', new Set(bodies.map((body) => body.id)).size === requiredIds.length && requiredIds.every((id) => byId.has(id)));
check(
  'physical records retain positive radius, orbital period, and explicit units',
  bodies.every((body) => body.radiusKm > 0)
    && bodies.filter((body) => body.id !== 'sun').every((body) => body.semiMajorAxis > 0 && body.orbitalPeriodDays > 0 && (body.semiMajorAxisUnit === 'AU' || body.semiMajorAxisUnit === 'km')),
);
check(
  'heliocentric records use AU and moon records use km',
  requiredPlanetIds.every((id) => byId.get(id)?.semiMajorAxisUnit === 'AU')
    && Object.values(requiredMoonParents).flat().every((id) => byId.get(id)?.semiMajorAxisUnit === 'km'),
);
check(
  'heliocentric order and orbital-period order are physically ordered',
  requiredPlanetIds.every((id, index) => index === 0 || byId.get(requiredPlanetIds[index - 1]).semiMajorAxis < byId.get(id).semiMajorAxis)
    && byId.get('mercury').orbitalPeriodDays < byId.get('earth').orbitalPeriodDays
    && byId.get('earth').orbitalPeriodDays < byId.get('jupiter').orbitalPeriodDays
    && byId.get('jupiter').orbitalPeriodDays < byId.get('pluto').orbitalPeriodDays,
);
check(
  'Pluto has noticeably high eccentricity and inclination',
  byId.get('pluto').eccentricity >= 0.2 && byId.get('pluto').inclinationDeg >= 15,
  { eccentricity: byId.get('pluto').eccentricity, inclinationDeg: byId.get('pluto').inclinationDeg },
);
check(
  'moon distances preserve each parent-system ordering',
  Object.entries(requiredMoonParents).every(([parentId, moonIds]) => moonIds.every((id, index) => index === 0 || byId.get(moonIds[index - 1]).semiMajorAxis < byId.get(id).semiMajorAxis)),
);
check('source manifest linkage remains in the data model', /sourceIds:\s*[A-Z_]+/.test(dataSource) && dataSource.includes('nasa-planetary-fact-sheet') && dataSource.includes('jpl-natural-satellite-physical-parameters'));

const distanceSource = readSource('src/scales/distanceScales.ts');
const sizeSource = readSource('src/scales/sizeScales.ts');
const sceneSource = readSource('src/scene/SolarSystemSceneController.ts');
const mechanicsSource = readSource('src/simulation/orbitalMechanics.ts');
const orbitSource = readSource('src/rendering/orbitLines.ts');
const nodeSource = readSource('src/scene/CelestialBodyNode.ts');
const materialSource = readSource('src/rendering/proceduralMaterials.ts');
const starSource = readSource('src/rendering/starField.ts');
const rendererSource = readSource('src/rendering/RendererEnvironment.ts');
const uiSource = readSource('src/ui/SolarSystemUI.ts');
const controlSource = readSource('src/ui/ControlPanel.ts');
const infoSource = readSource('src/ui/InfoPanel.ts');
const labelSource = readSource('src/ui/labels.ts');
const indexSource = readSource('src/ui/index.ts');
const mainSource = readSource('src/main.ts');
const cssSource = readSource('src/styles/solar-system.css');
const readmeSource = readSource('README.md');
const htmlSource = readSource('index.html');

check('default heliocentric mapping is logarithmic and bounded', /Math\.log1p/.test(distanceSource) && /maxDistanceAU: 39\.5/.test(distanceSource) && /minRenderDistance: 16/.test(distanceSource) && /maxRenderDistance: 190/.test(distanceSource));
check('linear and focus distance comparison modes are implemented', /mapLinearHeliocentricDistance/.test(distanceSource) && /mapFocusDistance/.test(distanceSource) && /value === 'log'/.test(distanceSource));
check('moon distances use a separate local logarithmic mapping', /mapSatelliteDistance/.test(distanceSource) && /Math\.log1p/.test(distanceSource) && /minRenderDistance: 2\.5/.test(distanceSource) && /maxRenderDistance: 9/.test(distanceSource));
check('body sizes are independently mapped from physical radii', /mapPlanetRadius/.test(sizeSource) && /mapMoonRadius/.test(sizeSource) && /Math\.pow\(ratio, 0\.5\)/.test(sizeSource) && /SUN_RENDER_RADIUS = 8/.test(sizeSource));
check('all selectable size modes are present', ['enhanced-visibility', 'relative-size', 'uniform-markers'].every((mode) => sizeSource.includes(`'${mode}'`)));
check('scene hierarchy carries moons under parent moon-system groups', /moonSystemGroup/.test(sceneSource) && /parentGroup = data\.parentId/.test(sceneSource) && /parentGroup\.add\(node\.group\)/.test(sceneSource));
check('elliptical inclined orbits use Kepler mechanics and reusable orbit geometry', /solveKeplerEquation/.test(mechanicsSource) && /semiMinorAxis/.test(mechanicsSource) && /inclinationRadians/.test(mechanicsSource) && /buildOrbitPoints/.test(orbitSource) && /LineLoop/.test(orbitSource));
check('orbital periods drive accumulated simulation positions', /elapsedDays \/ options\.orbitalPeriodDays/.test(mechanicsSource) && /clock\.advance\(realDeltaSeconds\)/.test(sceneSource) && /updateBodyPositions/.test(sceneSource));
check('Saturn and Uranus rings are procedural scene geometry', /RingGeometry/.test(nodeSource) && /data\.nameEn === 'Saturn'/.test(nodeSource) && /data\.nameEn === 'Uranus'/.test(nodeSource));
check('body appearance uses in-memory procedural materials without external images', /CanvasTexture/.test(materialSource) && /createElement\('canvas'\)/.test(materialSource) && !/TextureLoader|new Image\(|loadAsync\(/.test(materialSource));
check('star field and Sun illumination are present', /createStarField/.test(starSource) && /PointLight/.test(sceneSource) && /sun-light/.test(sceneSource));
check('renderer caps pixel ratio and handles resize/disposal', /Math\.min\(devicePixelRatio, this\.maxPixelRatio\)/.test(rendererSource) && /ResizeObserver/.test(rendererSource) && /forceContextLoss/.test(rendererSource) && /dispose\(\)/.test(rendererSource));
check('scene disposal releases geometry/material resources', /disposeSceneResources/.test(sceneSource) && /geometry\?\.dispose\(\)/.test(sceneSource) && /disposeMaterial/.test(sceneSource));
check('UI mounts OrbitControls, raycasting, focus, and keyboard reset', /OrbitControls/.test(uiSource) && /Raycaster/.test(uiSource) && /focusBody/.test(uiSource) && /dblclick/.test(uiSource) && /Escape/.test(uiSource));
check('UI includes complete controls, selectors, visibility toggles, and reset actions', ['Play', 'Pause', 'Complete view', 'Reset time', 'Distance scale', 'Body size', 'Orbit lines', 'Labels', 'Moons', 'Moon orbits', 'Star field'].every((label) => controlSource.includes(label)));
check('detail panel separates real and rendered values and moon selection', /REAL ASTRONOMICAL DATA/.test(infoSource) && /CURRENT RENDERED VIEW/.test(infoSource) && /Actual radius/.test(infoSource) && /Rendered orbital radius/.test(infoSource) && /moon-list/.test(infoSource) && /focusBody\(moon\.id\)/.test(infoSource));
check('screen labels show Korean and English names with selected-system moon behavior', /solar-label-layer/.test(labelSource) && /nameKo/.test(labelSource) && /nameEn/.test(labelSource) && /selectedSystemId/.test(labelSource));
check('browser entry and visible scale disclaimer are wired', /data-solar-system-ui/.test(htmlSource) && /autoMountSolarSystemUI/.test(indexSource) && /logarithmic scale/.test(uiSource) && /do not share one uniform physical scale/.test(uiSource));
check('responsive CSS covers mobile layout without horizontal overflow', /@media \(max-width: 680px\)/.test(cssSource) && /right: 10px/.test(cssSource) && /left: 10px/.test(cssSource) && /overflow: hidden/.test(cssSource));
check('README documents data provenance, formulas, execution, and moon selection', /npm install/.test(readmeSource) && /NASA\/JPL/.test(readmeSource) && /log1p/.test(readmeSource) && /Body-size policy/.test(readmeSource) && /Moon-selection policy/.test(readmeSource));
check('main exposes stable lifecycle and scale-control bootstrap methods', /createSolarSystemApplication/.test(mainSource) && /start\(\)/.test(mainSource) && /dispose\(\)/.test(mainSource) && /setDistanceScale/.test(mainSource) && /setSizeScale/.test(mainSource));

const report = {
  generatedAt: new Date().toISOString(),
  sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  checks,
  passed: checks.filter((item) => item.passed).length,
  failed: checks.filter((item) => !item.passed).length,
};

if (process.env.ACCEPTANCE_OUTPUT) {
  const outputPath = path.resolve(root, process.env.ACCEPTANCE_OUTPUT);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

console.log(JSON.stringify(report, null, 2));
if (report.failed > 0) {
  process.exitCode = 1;
}
