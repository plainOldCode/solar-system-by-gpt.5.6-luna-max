const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function resolvePlaywrightModule() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE,
    path.join(process.cwd(), 'node_modules', 'playwright'),
    '/tmp/solar-system-playwright/node_modules/playwright',
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`Playwright module not found. Checked: ${candidates.join(', ')}`);
}

function resolveChromeExecutable() {
  const candidates = [
    process.env.CHROME_EXECUTABLE,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

const { chromium } = require(resolvePlaywrightModule());
const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:5173/';
const OUTPUT_PATH = process.env.SMOKE_OUTPUT ? path.resolve(process.cwd(), process.env.SMOKE_OUTPUT) : undefined;
const SCREENSHOT_DIR = process.env.SMOKE_SCREENSHOT_DIR ? path.resolve(process.cwd(), process.env.SMOKE_SCREENSHOT_DIR) : undefined;
if (SCREENSHOT_DIR) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}
const checks = [];
const observations = {};
const consoleErrors = [];
const pageErrors = [];
const requestFailures = [];

function sourceHead() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: process.cwd(), encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function assert(condition, message, details = undefined) {
  const check = { name: message, passed: Boolean(condition) };
  if (details !== undefined) check.details = details;
  checks.push(check);
  if (!condition) {
    throw new Error(message);
  }
}

async function readState(page) {
  return page.evaluate(() => {
    const ui = window.solarSystemUI;
    const current = ui.application.controller.getState();
    return {
      selectedBodyId: current.selectedBodyId,
      distanceScaleMode: current.distanceScaleMode,
      sizeScaleMode: current.sizeScaleMode,
      orbitVisibility: current.orbitVisibility,
      moonVisibility: current.moonVisibility,
      moonOrbitVisibility: current.moonOrbitVisibility,
      starFieldVisibility: current.starFieldVisibility,
      elapsedSimulationDays: current.elapsedSimulationDays,
      timeScaleDaysPerSecond: current.timeScaleDaysPerSecond,
      isPlaying: current.isPlaying,
      cameraPosition: ui.application.controller.camera.position.toArray(),
    };
  });
}

function vectorDistance(a, b) {
  return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));
}

async function projectBody(page, bodyId) {
  return page.evaluate((id) => {
    const ui = window.solarSystemUI;
    const controller = ui.application.controller;
    const world = controller.getBodyWorldPosition(id);
    if (!world) throw new Error(`No world position for ${id}`);
    world.project(controller.camera);
    const rect = controller.renderer.domElement.getBoundingClientRect();
    return {
      x: rect.left + (world.x * 0.5 + 0.5) * rect.width,
      y: rect.top + (-world.y * 0.5 + 0.5) * rect.height,
      ndcZ: world.z,
    };
  }, bodyId);
}

async function visibleLabels(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('.solar-label'))
    .filter((element) => !element.hidden)
    .map((element) => ({
      bodyId: element.dataset.bodyId,
      text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    })));
}

function writeReport(report) {
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (OUTPUT_PATH) {
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, serialized);
  }
  console.log(serialized);
}

(async () => {
  const executablePath = resolveChromeExecutable();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ['--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--disable-dev-shm-usage'],
  });
  const browserVersion = browser.version();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('requestfailed', (request) => requestFailures.push({ url: request.url(), failure: request.failure()?.errorText ?? 'unknown' }));

  const reportBase = {
    generatedAt: new Date().toISOString(),
    sourceHead: sourceHead(),
    baseUrl: BASE_URL,
    browserVersion,
    executablePath: executablePath ?? 'Playwright-managed browser',
  };

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.solarSystemUI && document.querySelector('.solar-ui')), undefined, { timeout: 15_000 });
    await page.waitForTimeout(250);

    assert(await page.locator('.solar-ui').count() === 1, 'bootstrap mounted one solar UI root');
    assert(await page.locator('canvas.solar-system-canvas').count() === 1, 'scene canvas is mounted');
    const bootstrap = await page.evaluate(() => ({
      mounted: document.querySelector('.solar-ui')?.getAttribute('data-solar-system-ui'),
      hasWindowApplication: Boolean(window.solarSystemApp),
      hasWindowUI: Boolean(window.solarSystemUI),
      canvasRect: (() => {
        const rect = document.querySelector('canvas.solar-system-canvas').getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      })(),
      totalLabels: document.querySelectorAll('.solar-label').length,
    }));
    assert(bootstrap.mounted === 'mounted' && bootstrap.hasWindowApplication && bootstrap.hasWindowUI, 'browser globals and mounted marker are available', bootstrap);
    observations.bootstrap = bootstrap;

    const initialLabels = await visibleLabels(page);
    const requiredVisibleBodyIds = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
    assert(requiredVisibleBodyIds.every((bodyId) => initialLabels.some((label) => label.bodyId === bodyId)), 'Sun through Pluto labels are visible in the complete Solar System view', { requiredVisibleBodyIds, initialLabels });
    observations.initialLabels = initialLabels;
    if (SCREENSHOT_DIR) {
      const desktopScreenshot = path.join(SCREENSHOT_DIR, 'final-acceptance-desktop.png');
      await page.screenshot({ path: desktopScreenshot });
      observations.screenshots = { desktop: desktopScreenshot };
    }

    for (const label of ['Play', 'Pause', 'Complete view', 'Reset time', 'Distance scale', 'Body size', 'Orbit lines', 'Labels', 'Moons', 'Moon orbits', 'Star field']) {
      const role = ['Distance scale', 'Body size'].includes(label)
        ? 'combobox'
        : ['Orbit lines', 'Labels', 'Moons', 'Moon orbits', 'Star field'].includes(label)
          ? 'checkbox'
          : 'button';
      assert(await page.getByRole(role, { name: label, exact: true }).count() === 1 || await page.getByLabel(label, { exact: true }).count() === 1, `required UI control exists: ${label}`);
    }

    const orbitBefore = await readState(page);
    await page.mouse.move(640, 400);
    await page.mouse.down();
    await page.mouse.move(715, 438, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(180);
    const orbitAfter = await readState(page);
    const orbitDistance = vectorDistance(orbitBefore.cameraPosition, orbitAfter.cameraPosition);
    assert(orbitDistance > 0.5, 'OrbitControls left-drag changes camera position', { orbitDistance, before: orbitBefore.cameraPosition, after: orbitAfter.cameraPosition });
    observations.orbitControls = { orbitDistance, before: orbitBefore.cameraPosition, after: orbitAfter.cameraPosition };

    await page.getByRole('button', { name: 'Complete view', exact: true }).click();
    await page.waitForTimeout(1_050);
    const resetState = await readState(page);
    assert(resetState.selectedBodyId === null, 'Complete view resets selection');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.waitForTimeout(120);

    const earthPoint = await projectBody(page, 'earth');
    assert(earthPoint.ndcZ >= -1 && earthPoint.ndcZ <= 1, 'Earth projects into the camera depth range', earthPoint);
    await page.mouse.move(earthPoint.x, earthPoint.y);
    await page.waitForTimeout(80);
    const tooltip = await page.locator('.hover-tooltip').evaluate((element) => ({ hidden: element.hidden, text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '' }));
    assert(!tooltip.hidden && tooltip.text.includes('Earth'), 'hover tooltip exposes Korean/English body identity and type', tooltip);
    await page.mouse.click(earthPoint.x, earthPoint.y);
    await page.waitForTimeout(60);
    const selectedEarth = await readState(page);
    assert(selectedEarth.selectedBodyId === 'earth', 'Raycaster pointer click selects Earth', { point: earthPoint, state: selectedEarth });

    const focusStart = selectedEarth.cameraPosition;
    await page.waitForTimeout(140);
    const focusMiddle = (await readState(page)).cameraPosition;
    await page.waitForTimeout(1_000);
    const focusEnd = (await readState(page)).cameraPosition;
    const focusStartToMiddle = vectorDistance(focusStart, focusMiddle);
    const focusMiddleToEnd = vectorDistance(focusMiddle, focusEnd);
    assert(focusStartToMiddle > 0.05, 'camera focus transition moves during its interval', { focusStartToMiddle, focusMiddleToEnd });
    assert(focusMiddleToEnd > 0.05, 'camera focus transition continues beyond the first sample', { focusStartToMiddle, focusMiddleToEnd });
    observations.smoothCameraFocus = { focusStartToMiddle, focusMiddleToEnd, focusStart, focusMiddle, focusEnd };

    const earthInfo = await page.locator('.info-panel').innerText();
    for (const expected of ['지구 · Earth', 'REAL ASTRONOMICAL DATA', 'Actual radius', 'Mean distance', 'Orbital period', 'Rotation period', 'Orbital eccentricity', 'Orbital inclination', 'CURRENT RENDERED VIEW', 'Rendered orbital radius', 'Distance representation', 'Rendered body radius', 'Size representation']) {
      assert(earthInfo.includes(expected), `detail panel contains ${expected}`, { excerpt: earthInfo.slice(0, 1_200) });
    }
    observations.detailPanel = earthInfo.replace(/\s+/g, ' ').trim();

    const labelsAfterEarth = await visibleLabels(page);
    assert(labelsAfterEarth.some((label) => label.bodyId === 'earth' && label.text.includes('Earth')), 'selected Earth label is visible', labelsAfterEarth.filter((label) => label.bodyId === 'earth'));
    observations.labelsAfterEarth = labelsAfterEarth;

    const labelsToggle = page.getByLabel('Labels', { exact: true });
    await labelsToggle.uncheck();
    await page.waitForTimeout(80);
    assert((await page.locator('.solar-label-layer').getAttribute('hidden')) !== null, 'Labels toggle hides the label layer');
    await labelsToggle.check();
    await page.waitForTimeout(80);
    assert((await page.locator('.solar-label-layer').getAttribute('hidden')) === null, 'Labels toggle restores the label layer');

    const orbitToggle = page.getByLabel('Orbit lines', { exact: true });
    await orbitToggle.uncheck();
    assert((await readState(page)).orbitVisibility === false, 'Orbit visibility toggle updates live controller state');
    await orbitToggle.check();
    const moonToggle = page.getByLabel('Moons', { exact: true });
    await moonToggle.uncheck();
    assert((await readState(page)).moonVisibility === false, 'Moon visibility toggle updates live controller state');
    await moonToggle.check();
    observations.visibilityToggles = await readState(page);

    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.waitForTimeout(120);
    const pausedBefore = await readState(page);
    await page.waitForTimeout(220);
    const pausedAfter = await readState(page);
    assert(pausedBefore.isPlaying === false && pausedAfter.isPlaying === false, 'Pause control stops simulation');
    assert(Math.abs(pausedAfter.elapsedSimulationDays - pausedBefore.elapsedSimulationDays) < 0.001, 'paused simulation readout remains stable', { pausedBefore, pausedAfter });
    await page.getByLabel('Time scale', { exact: true }).selectOption('1');
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.waitForTimeout(260);
    const playingAfter = await readState(page);
    assert(playingAfter.isPlaying === true, 'Play control resumes simulation');
    assert(playingAfter.elapsedSimulationDays > pausedAfter.elapsedSimulationDays, 'simulation elapsed days advance while playing', { pausedAfter, playingAfter });
    await page.getByRole('button', { name: 'Reset time', exact: true }).click();
    const resetTime = await readState(page);
    assert(resetTime.elapsedSimulationDays < 0.01, 'Reset time control returns elapsed simulation to zero', resetTime);
    observations.simulationControls = { pausedBefore, pausedAfter, playingAfter, resetTime };

    const disclaimer = await page.locator('.scale-disclaimer').innerText();
    assert(disclaimer.includes('logarithmic scale'), 'scale disclaimer explains logarithmic orbital-distance compression');
    assert(disclaimer.includes('body sizes are visually enlarged'), 'scale disclaimer explains enhanced body sizes');
    assert(disclaimer.includes('do not share one uniform physical scale'), 'scale disclaimer distinguishes rendered scales');
    await page.getByLabel('Distance scale', { exact: true }).selectOption('linear');
    await page.waitForTimeout(100);
    const linearState = await readState(page);
    assert(linearState.distanceScaleMode === 'linear', 'distance scale selector changes to Linear Scale');
    assert((await page.locator('.info-panel').innerText()).includes('Linear Scale · comparison'), 'detail panel reports active linear distance scale');
    await page.getByLabel('Distance scale', { exact: true }).selectOption('focus');
    await page.waitForTimeout(100);
    const focusScaleState = await readState(page);
    assert(focusScaleState.distanceScaleMode === 'focus', 'distance scale selector changes to Focus Scale');
    await page.getByLabel('Body size', { exact: true }).selectOption('uniform-markers');
    await page.waitForTimeout(100);
    const uniformState = await readState(page);
    assert(uniformState.sizeScaleMode === 'uniform-markers', 'body-size selector changes to Uniform Markers');
    observations.scaleSelectors = { disclaimer: disclaimer.replace(/\s+/g, ' ').trim(), linearState, focusScaleState, uniformState };

    await page.getByRole('button', { name: 'Complete view', exact: true }).click();
    await page.waitForTimeout(1_050);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.waitForTimeout(120);
    const jupiterPoint = await projectBody(page, 'jupiter');
    await page.mouse.click(jupiterPoint.x, jupiterPoint.y);
    await page.waitForTimeout(120);
    const selectedJupiter = await readState(page);
    assert(selectedJupiter.selectedBodyId === 'jupiter', 'Raycaster pointer click selects Jupiter');
    const jupiterInfo = await page.locator('.info-panel').innerText();
    assert(jupiterInfo.includes('목성 · Jupiter'), 'Jupiter detail panel is shown');
    for (const moon of ['Io', 'Europa', 'Ganymede', 'Callisto']) {
      assert(jupiterInfo.includes(moon), `Jupiter inspector lists ${moon}`);
    }
    const ioItem = page.locator('.moon-list [data-body-id="io"]');
    assert(await ioItem.count() === 1, 'Jupiter inspector exposes selectable Io item');
    await ioItem.click();
    await page.waitForTimeout(140);
    const selectedIo = await readState(page);
    assert(selectedIo.selectedBodyId === 'io', 'documented moon-list selection focuses Io');
    const ioInfo = await page.locator('.info-panel').innerText();
    assert(ioInfo.includes('이오 · Io'), 'moon detail panel shows Io real data');
    for (const moon of ['Io', 'Europa', 'Ganymede', 'Callisto']) {
      assert(ioInfo.includes(moon), `moon inspector preserves parent-system list entry ${moon}`);
    }
    const labelsAfterIo = await visibleLabels(page);
    for (const moonId of ['io', 'europa', 'ganymede', 'callisto']) {
      assert(labelsAfterIo.some((label) => label.bodyId === moonId), `selecting Io reveals sibling moon label ${moonId}`);
    }
    observations.moonSelection = { selectedIo, jupiterInfo: jupiterInfo.replace(/\s+/g, ' ').trim(), ioInfo: ioInfo.replace(/\s+/g, ' ').trim(), visibleJupiterLabels: labelsAfterIo.filter((label) => ['io', 'europa', 'ganymede', 'callisto'].includes(label.bodyId)) };

    await page.getByRole('button', { name: 'Complete view', exact: true }).click();
    await page.waitForTimeout(1_050);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.waitForTimeout(120);
    const plutoPoint = await projectBody(page, 'pluto');
    assert(plutoPoint.ndcZ >= -1 && plutoPoint.ndcZ <= 1, 'Pluto projects into the complete-view camera depth range', plutoPoint);
    await page.mouse.click(plutoPoint.x, plutoPoint.y);
    await page.waitForTimeout(140);
    const selectedPluto = await readState(page);
    assert(selectedPluto.selectedBodyId === 'pluto', 'Raycaster pointer click selects Pluto');
    const plutoInfo = await page.locator('.info-panel').innerText();
    assert(plutoInfo.includes('명왕성 · Pluto') && plutoInfo.includes('Charon'), 'Pluto detail panel includes its dwarf-planet identity and Charon', plutoInfo.replace(/\s+/g, ' ').trim());
    observations.plutoSelection = { selectedPluto, plutoInfo: plutoInfo.replace(/\s+/g, ' ').trim() };

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(350);
    const panelToggle = page.getByRole('button', { name: 'Hide panels', exact: true });
    assert(await panelToggle.count() === 1 && await panelToggle.isVisible(), 'mobile panel toggle is visible in the upper-right menu area');
    const panelToggleBounds = await panelToggle.boundingBox();
    assert(Boolean(panelToggleBounds && panelToggleBounds.x >= 390 - panelToggleBounds.width - 24 && panelToggleBounds.y <= 24), 'mobile panel toggle is positioned in the upper-right corner', panelToggleBounds);
    await panelToggle.click();
    await page.waitForTimeout(80);
    const hiddenPanels = await page.evaluate(() => ({
      rootHiddenState: document.querySelector('.solar-ui')?.classList.contains('solar-ui--panels-hidden') ?? false,
      headerDisplay: getComputedStyle(document.querySelector('.solar-header')).display,
      controlDisplay: getComputedStyle(document.querySelector('.control-panel')).display,
      infoDisplay: getComputedStyle(document.querySelector('.info-panel')).display,
      disclaimerDisplay: getComputedStyle(document.querySelector('.scale-disclaimer')).display,
    }));
    assert(hiddenPanels.rootHiddenState && hiddenPanels.headerDisplay === 'none' && hiddenPanels.controlDisplay === 'none' && hiddenPanels.infoDisplay === 'none' && hiddenPanels.disclaimerDisplay === 'none', 'Hide panels collapses the mobile overlay panels', hiddenPanels);
    const showPanelsButton = page.getByRole('button', { name: 'Show panels', exact: true });
    assert(await showPanelsButton.count() === 1 && await showPanelsButton.isVisible(), 'mobile panel toggle changes to Show panels while collapsed');
    await showPanelsButton.click();
    await page.waitForTimeout(80);
    const restoredPanels = await page.evaluate(() => ({
      rootHiddenState: document.querySelector('.solar-ui')?.classList.contains('solar-ui--panels-hidden') ?? true,
      headerDisplay: getComputedStyle(document.querySelector('.solar-header')).display,
      controlDisplay: getComputedStyle(document.querySelector('.control-panel')).display,
      infoDisplay: getComputedStyle(document.querySelector('.info-panel')).display,
      disclaimerDisplay: getComputedStyle(document.querySelector('.scale-disclaimer')).display,
    }));
    assert(!restoredPanels.rootHiddenState && restoredPanels.headerDisplay !== 'none' && restoredPanels.controlDisplay !== 'none' && restoredPanels.infoDisplay !== 'none' && restoredPanels.disclaimerDisplay !== 'none', 'Show panels restores the mobile overlay panels', restoredPanels);
    const mobile = await page.evaluate(() => {
      const root = document.querySelector('.solar-ui');
      const canvas = document.querySelector('canvas.solar-system-canvas');
      const control = document.querySelector('.control-panel');
      const info = document.querySelector('.info-panel');
      const rootRect = root.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const controlRect = control.getBoundingClientRect();
      const infoRect = info.getBoundingClientRect();
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        root: { width: rootRect.width, height: rootRect.height },
        canvas: { width: canvasRect.width, height: canvasRect.height },
        cameraAspect: window.solarSystemUI.application.controller.camera.aspect,
        control: { left: controlRect.left, right: controlRect.right, top: controlRect.top, bottom: controlRect.bottom, width: controlRect.width, height: controlRect.height, clientHeight: control.clientHeight, scrollHeight: control.scrollHeight },
        info: { left: infoRect.left, right: infoRect.right, top: infoRect.top, bottom: infoRect.bottom, width: infoRect.width, height: infoRect.height, clientHeight: info.clientHeight, scrollHeight: info.scrollHeight, moonListItems: info.querySelectorAll('.moon-list [data-body-id]').length },
        documentScrollWidth: document.documentElement.scrollWidth,
      };
    });
    assert(mobile.viewport.width === 390 && mobile.viewport.height === 844, 'browser smoke uses mobile viewport');
    assert(Math.abs(mobile.canvas.width - 390) < 1 && Math.abs(mobile.canvas.height - 844) < 1, 'canvas resizes to mobile viewport', mobile);
    assert(Math.abs(mobile.cameraAspect - (390 / 844)) < 0.01, 'camera aspect updates after mobile resize', mobile);
    assert(mobile.control.left >= 0 && mobile.control.right <= 390, 'mobile control panel stays inside viewport', mobile.control);
    assert(mobile.info.left >= 0 && mobile.info.right <= 390, 'mobile inspector stays inside viewport', mobile.info);
    assert(mobile.info.scrollHeight >= mobile.info.clientHeight, 'mobile inspector content remains available through panel scrolling', mobile.info);
    assert(mobile.documentScrollWidth <= 390, 'mobile layout does not create horizontal page overflow', mobile);
    observations.responsive = mobile;
    if (SCREENSHOT_DIR) {
      const mobileScreenshot = path.join(SCREENSHOT_DIR, 'final-acceptance-mobile.png');
      await page.screenshot({ path: mobileScreenshot });
      observations.screenshots = { ...(observations.screenshots ?? {}), mobile: mobileScreenshot };
    }

    await page.evaluate(() => {
      window.solarSystemUI?.dispose();
      window.solarSystemApp?.dispose();
    });
    await page.waitForTimeout(80);
    const disposed = await page.evaluate(() => ({
      hasSolarUI: Boolean(window.solarSystemUI),
      canvasCount: document.querySelectorAll('canvas.solar-system-canvas').length,
      mountedRootCount: document.querySelectorAll('.solar-ui').length,
    }));
    assert(!disposed.hasSolarUI && disposed.canvasCount === 0 && disposed.mountedRootCount === 0, 'UI and scene disposal release the mounted browser resources', disposed);
    observations.disposal = disposed;

    assert(consoleErrors.length === 0, 'browser console has no error-level messages', consoleErrors);
    assert(pageErrors.length === 0, 'browser pageerror stream is empty', pageErrors);
    assert(requestFailures.length === 0, 'browser request failure stream is empty', requestFailures);

    writeReport({ ...reportBase, checks, observations, consoleErrors, pageErrors, requestFailures, passed: checks.filter((check) => check.passed).length, failed: checks.filter((check) => !check.passed).length });
  } catch (error) {
    writeReport({ ...reportBase, checks, observations, consoleErrors, pageErrors, requestFailures, passed: checks.filter((check) => check.passed).length, failed: checks.filter((check) => !check.passed).length + 1, failure: String(error && error.stack ? error.stack : error) });
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
