// Verificação e2e completa em 390x844:
// CaseMap -> Caso 1 (intro à vitória) -> Expansão -> CaseMap -> replay ->
// Caso 2 (?case=2 + botão Continuar) -> Expansão -> CaseMap completo.
// Uso: npm run verify
import { mkdirSync } from 'node:fs';
import { preview } from 'vite';
import { chromium } from 'playwright';

const PORT = 4317;
const SHOTS = 'screenshots';
const fails = [];

function ok(cond, msg) {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${msg}`);
  if (!cond) {
    fails.push(msg);
  }
}

const getState = (page) => page.evaluate(() => window.__blecaute.getState());
const getMap = (page) => page.evaluate(() => window.__blecauteMap);

async function waitMap(page, cond, label) {
  try {
    await page.waitForFunction(cond, undefined, { timeout: 25000 });
    ok(true, label);
  } catch {
    ok(false, `${label} (timeout)`);
  }
}

async function walkTo(page, tx, ty, label) {
  const held = new Set();
  const deadline = Date.now() + 18000;
  let dist = Infinity;
  while (Date.now() < deadline) {
    const s = await getState(page);
    const dx = tx - s.x;
    const dy = ty - s.y;
    dist = Math.hypot(dx, dy);
    if (dist < 24) {
      break;
    }
    const want = new Set();
    if (dx < -6) {
      want.add('ArrowLeft');
    } else if (dx > 6) {
      want.add('ArrowRight');
    }
    if (dy < -6) {
      want.add('ArrowUp');
    } else if (dy > 6) {
      want.add('ArrowDown');
    }
    for (const k of [...held]) {
      if (!want.has(k)) {
        await page.keyboard.up(k);
        held.delete(k);
      }
    }
    for (const k of want) {
      if (!held.has(k)) {
        await page.keyboard.down(k);
        held.add(k);
      }
    }
    await page.waitForTimeout(70);
  }
  for (const k of [...held]) {
    await page.keyboard.up(k);
  }
  ok(dist < 24, `andou até ${label} (dist ${Math.round(dist)}px)`);
}

async function advanceDialogue(page) {
  await page.waitForSelector('#ui-dialogue.visible', { timeout: 4000 });
  for (let i = 0; i < 12; i++) {
    if (!(await page.isVisible('#ui-dialogue.visible'))) {
      return;
    }
    await page.click('#ui-dialogue');
    await page.waitForTimeout(200);
  }
}

async function tapInteract(page, expectedPart) {
  const deadline = Date.now() + 5000;
  let txt = '';
  while (Date.now() < deadline) {
    if (await page.isVisible('#ui-interact.visible')) {
      txt = (await page.textContent('#ui-interact')) ?? '';
      if (txt.includes(expectedPart)) {
        break;
      }
    }
    await page.waitForTimeout(120);
  }
  ok(txt.includes(expectedPart), `botão contextual "${expectedPart}" (atual: "${txt.trim()}")`);
  await page.click('#ui-interact');
}

async function clickPin(page, caseId) {
  const map = await getMap(page);
  const pin = map.pins.find((p) => p.caseId === caseId);
  await page.mouse.click(pin.x, pin.y);
}

// TitleScreen é a porta de entrada: um toque inicia -> CaseMap.
async function startToCaseMap(page) {
  await page.waitForFunction(() => window.__blecauteTitle?.ready, undefined, { timeout: 20000 });
  const vp = page.viewportSize();
  await page.mouse.click(Math.round(vp.width / 2), Math.round(vp.height / 2));
  await page.waitForFunction(() => !!window.__blecauteMap, undefined, { timeout: 20000 });
  await page.waitForTimeout(150);
}

mkdirSync(SHOTS, { recursive: true });
const server = await preview({ preview: { port: PORT, strictPort: true } });
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));

try {
  // ===== TITLESCREEN -> CASEMAP =====
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => window.__blecauteTitle?.ready, undefined, { timeout: 25000 });
  ok(true, 'boot leva à TitleScreen (porta de entrada)');
  // fallback gracioso: AudioManager responde mesmo sem arquivos de áudio
  ok((await page.evaluate(() => window.__audioTest?.())) === true, 'AudioManager responde sem arquivos');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/00-title.png` });
  // transição cinematográfica: toca e captura o meio do fade
  const vp0 = page.viewportSize();
  await page.mouse.click(Math.round(vp0.width / 2), Math.round(vp0.height / 2));
  await page.waitForTimeout(190);
  await page.screenshot({ path: `${SHOTS}/00b-title-transition.png` });
  await page.waitForFunction(() => !!window.__blecauteMap, undefined, { timeout: 20000 });
  ok(true, 'tocar na TitleScreen transiciona para o CaseMap');
  let map = await getMap(page);
  ok(map.pins.find((p) => p.caseId === 'case1')?.state === 'available', 'pin vila aurora disponível');
  ok(map.pins.find((p) => p.caseId === 'case2')?.state === 'locked', 'pin centro bloqueado no início');
  ok(map.pins.filter((p) => !p.caseId).length === 2, 'pins sertão/norte em breve');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/01-casemap.png` });

  // ===== CASO 1 =====
  await clickPin(page, 'case1');
  await page.waitForSelector('#ui-dialogue.visible', { timeout: 25000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/02-intro-dialogo.png` });
  ok(true, 'intro do caso 1 abre com retrato do saci');
  await advanceDialogue(page);
  ok(!(await page.isVisible('#ui-dialogue.visible')), 'intro fecha ao avançar as páginas');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/03-mundo.png` });

  // joystick flutuante
  await page.mouse.move(140, 650);
  await page.mouse.down();
  await page.mouse.move(140, 596, { steps: 4 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/04-joystick.png` });
  await page.mouse.up();

  // 3 pistas
  await walkTo(page, 270, 455, 'Dona Marta');
  await tapInteract(page, 'Falar: Dona Marta');
  await advanceDialogue(page);
  ok(((await page.textContent('#ui-clues')) ?? '').includes('1/5'), 'badge mostra Pistas 1/5');

  await walkTo(page, 460, 1035, 'Kiko');
  await tapInteract(page, 'Falar: Kiko');
  await advanceDialogue(page);

  await walkTo(page, 600, 1196, 'Transformador VA-03');
  await tapInteract(page, 'Inspecionar');
  await advanceDialogue(page);
  ok(((await page.textContent('#ui-clues')) ?? '').includes('3/5'), 'badge mostra Pistas 3/5');

  // caderno
  await page.click('#ui-clues');
  await page.waitForSelector('#ui-journal.visible', { timeout: 3000 });
  const clueItems = await page.locator('#ui-journal-list li').count();
  ok(clueItems === 3, `caderno lista 3 pistas (${clueItems})`);
  await page.click('#ui-journal-close');

  // acusação
  await walkTo(page, 480, 1100, 'ponto aberto');
  await tapInteract(page, 'ACUSAR');
  await page.waitForSelector('#ui-accuse.visible', { timeout: 3000 });
  await page.screenshot({ path: `${SHOTS}/05-acusacao.png` });

  await page.click('button.suspect[data-id="marta"]');
  await page.waitForSelector('#ui-dialogue.visible', { timeout: 3000 });
  ok(true, 'acusação errada gera réplica do saci');
  await advanceDialogue(page);
  let s = await getState(page);
  ok(s.solved === false, 'caso segue aberto após acusação errada');

  await tapInteract(page, 'ACUSAR');
  await page.waitForSelector('#ui-accuse.visible', { timeout: 3000 });
  await page.click('button.suspect[data-id="dono_galpao"]');
  await advanceDialogue(page); // reveal
  await page.waitForSelector('#ui-victory.visible', { timeout: 3000 });
  await page.screenshot({ path: `${SHOTS}/06-vitoria.png` });
  s = await getState(page);
  ok(s.solved === true, 'flag solved ativa');
  ok(s.lightsOn === true, 'luzes param de piscar e acendem');

  // expansão
  await page.click('#ui-victory-done');
  await page.waitForSelector('#ui-expansion', { timeout: 3000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/07-expansao.png` });
  ok(true, 'overlay de expansão aparece após o caso 1');
  await page.click('.expansion-card[data-id="solar"]');
  await page.waitForSelector('#ui-expansion-done', { timeout: 3000 });
  await page.click('#ui-expansion-done');

  // volta ao mapa com pin2 desbloqueado
  await waitMap(
    page,
    () => window.__blecauteMap?.pins?.find((p) => p.caseId === 'case1')?.state === 'solved',
    'volta ao casemap com vila aurora resolvida',
  );
  map = await getMap(page);
  ok(map.pins.find((p) => p.caseId === 'case2')?.state === 'available', 'pin centro desbloqueado');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/08-casemap-final.png` });

  // replay do caso resolvido: luzes acesas, sem intro
  await clickPin(page, 'case1');
  await page.waitForFunction(
    () => window.__blecaute?.getState?.().caseId === 'case1' && window.__blecaute.getState().lightsOn,
    undefined,
    { timeout: 25000 },
  );
  ok(!(await page.isVisible('#ui-dialogue.visible')), 'replay não repete a intro');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}/09-mundo-resolvido.png` });

  // ===== CASO 2 =====
  await page.goto(`http://localhost:${PORT}/?case=2`);
  await page.waitForSelector('#ui-dialogue.visible', { timeout: 25000 });
  ok(true, '?case=2 vai direto ao caso 2');
  await advanceDialogue(page);

  await walkTo(page, 280, 545, 'Dona Cida');
  await tapInteract(page, 'Falar: Dona Cida');
  await page.waitForSelector('#ui-dialogue.visible', { timeout: 3000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/10-case2-dona-cida.png` });
  await advanceDialogue(page);
  ok(((await page.textContent('#ui-clues')) ?? '').includes('1/5'), 'caso 2: Pistas 1/5');

  // persistência + botão continuar
  await page.goto(`http://localhost:${PORT}/`);
  await startToCaseMap(page);
  await waitMap(page, () => !!window.__blecauteMap?.continue, 'casemap oferece Continuar (caso 2 em andamento)');
  map = await getMap(page);
  if (!map.continue) {
    ok(false, 'botão Continuar ausente — pulando clique');
  } else {
    await page.mouse.click(map.continue.x, map.continue.y);
  }
  await page.waitForFunction(
    () => window.__blecaute?.getState?.().caseId === 'case2' && window.__blecaute.getState().clues === 1,
    undefined,
    { timeout: 25000 },
  );
  ok(true, 'continuar retoma o caso 2 com 1 pista');
  ok(!(await page.isVisible('#ui-dialogue.visible')), 'caso 2 não repete a intro ao continuar');

  await walkTo(page, 620, 585, 'Curva de carga CT-07');
  await tapInteract(page, 'Inspecionar');
  await page.waitForSelector('#ui-dialogue.visible', { timeout: 3000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/11-case2-curva-carga.png` });
  await advanceDialogue(page);

  await walkTo(page, 660, 965, 'Transformador do quarteirão');
  await tapInteract(page, 'Inspecionar');
  await advanceDialogue(page);
  ok(((await page.textContent('#ui-clues')) ?? '').includes('3/5'), 'caso 2: Pistas 3/5');

  await walkTo(page, 520, 1180, 'ponto aberto (praça)');
  await tapInteract(page, 'ACUSAR');
  await page.waitForSelector('#ui-accuse.visible', { timeout: 3000 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOTS}/13-case2-acusacao.png` });
  const faces = await page.locator('#ui-accuse .suspect-face').count();
  ok(faces >= 1, `acusação mostra retrato do suspeito (${faces})`);
  await page.click('button.suspect[data-id="morador_sobrado"]');
  await advanceDialogue(page); // reveal
  await page.waitForSelector('#ui-victory.visible', { timeout: 3000 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOTS}/14-case2-vitoria.png` });
  s = await getState(page);
  ok(s.solved === true && s.lightsOn === true, 'caso 2 resolvido (mineradora clandestina)');
  await page.click('#ui-victory-done');
  await page.waitForSelector('#ui-expansion', { timeout: 3000 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOTS}/15-case2-expansao.png` });
  await page.click('.expansion-card[data-id="bateria"]');
  await page.waitForSelector('#ui-expansion-done', { timeout: 3000 });
  await page.click('#ui-expansion-done');

  await waitMap(
    page,
    () => window.__blecauteMap?.pins?.find((p) => p.caseId === 'case2')?.state === 'solved',
    'casemap final com os dois casos resolvidos',
  );
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/12-casemap-completo.png` });

  ok(pageErrors.length === 0, `sem erros de página${pageErrors[0] ? ` (1º: ${pageErrors[0]})` : ''}`);
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}

console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK');
process.exit(fails.length ? 1 : 0);
