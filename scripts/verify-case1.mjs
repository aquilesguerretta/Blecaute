// Verificação e2e do Caso 1: joga do intro à vitória em 390x844 e tira screenshots.
// Uso: npm run verify  (faz o build antes e serve o dist via vite preview)
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

async function walkTo(page, tx, ty, label) {
  const held = new Set();
  const deadline = Date.now() + 15000;
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

async function waitInteractLabel(page, part, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  let txt = '';
  while (Date.now() < deadline) {
    if (await page.isVisible('#ui-interact.visible')) {
      txt = (await page.textContent('#ui-interact')) ?? '';
      if (txt.includes(part)) {
        return txt;
      }
    }
    await page.waitForTimeout(120);
  }
  return txt;
}

async function tapInteract(page, expectedPart) {
  const txt = await waitInteractLabel(page, expectedPart);
  ok(txt.includes(expectedPart), `botão contextual "${expectedPart}" (atual: "${txt}")`);
  await page.click('#ui-interact');
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
  await page.goto(`http://localhost:${PORT}/`);

  // 1) intro abre sozinha (diálogo aberto)
  await page.waitForSelector('#ui-dialogue.visible', { timeout: 15000 });
  await page.screenshot({ path: `${SHOTS}/01-intro-dialogo.png` });
  ok(true, 'intro abre com diálogo do Saci');
  for (let i = 0; i < 3; i++) {
    await page.click('#ui-dialogue');
    await page.waitForTimeout(220);
  }
  ok(!(await page.isVisible('#ui-dialogue.visible')), 'intro fecha após 3 toques');

  // 2) mundo visível
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/02-mundo.png` });

  // 3) joystick flutuante aparece no toque
  await page.mouse.move(140, 650);
  await page.mouse.down();
  await page.mouse.move(140, 596, { steps: 4 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/03-joystick.png` });
  await page.mouse.up();

  // 4) coleta 3 pistas: Dona Marta (c1), Kiko (c2), Trafo (c3)
  await walkTo(page, 200, 338, 'Dona Marta');
  await tapInteract(page, 'Falar: Dona Marta');
  await advanceDialogue(page);
  ok(((await page.textContent('#ui-clues')) ?? '').includes('1/5'), 'badge mostra Pistas 1/5');

  await walkTo(page, 280, 750, 'Kiko');
  await tapInteract(page, 'Falar: Kiko');
  await advanceDialogue(page);

  await walkTo(page, 455, 818, 'Transformador VA-03');
  await tapInteract(page, 'Inspecionar');
  await advanceDialogue(page);
  ok(((await page.textContent('#ui-clues')) ?? '').includes('3/5'), 'badge mostra Pistas 3/5');

  // 5) caderno abre e lista as pistas
  await page.click('#ui-clues');
  await page.waitForSelector('#ui-journal.visible', { timeout: 3000 });
  const clueItems = await page.locator('#ui-journal-list li').count();
  ok(clueItems === 3, `caderno lista 3 pistas (${clueItems})`);
  await page.click('#ui-journal-close');

  // 6) afastar dos NPCs -> botão vira ACUSAR (saci segue o player)
  await walkTo(page, 380, 745, 'ponto aberto');
  await tapInteract(page, 'ACUSAR');
  await page.waitForSelector('#ui-accuse.visible', { timeout: 3000 });
  await page.screenshot({ path: `${SHOTS}/04-acusacao.png` });

  // 7) acusação errada -> réplica do Saci e volta ao jogo
  await page.click('button.suspect[data-id="marta"]');
  await page.waitForSelector('#ui-dialogue.visible', { timeout: 3000 });
  ok(true, 'acusação errada gera réplica do Saci');
  await advanceDialogue(page);
  let s = await getState(page);
  ok(s.solved === false, 'caso segue aberto após acusação errada');

  // 8) acusação certa -> reveal + vitória + luzes acendem
  await tapInteract(page, 'ACUSAR');
  await page.waitForSelector('#ui-accuse.visible', { timeout: 3000 });
  await page.click('button.suspect[data-id="dono_galpao"]');
  await advanceDialogue(page); // reveal do Saci
  await page.waitForSelector('#ui-victory.visible', { timeout: 3000 });
  await page.screenshot({ path: `${SHOTS}/05-vitoria.png` });
  await page.click('#ui-victory-done');
  await page.waitForTimeout(900);
  s = await getState(page);
  ok(s.solved === true, 'flag solved ativa após acusar o culpado');
  ok(s.lightsOn === true, 'luzes do mapa param de piscar e acendem');
  await page.screenshot({ path: `${SHOTS}/06-mundo-resolvido.png` });

  // 9) persistência: reload mantém pistas, solved e não repete a intro
  await page.reload();
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForTimeout(1200);
  s = await getState(page);
  ok(s.clues === 3 && s.solved === true, `save restaura (pistas ${s.clues}, solved ${s.solved})`);
  ok(!(await page.isVisible('#ui-dialogue.visible')), 'intro não repete após reload');
  ok(((await page.textContent('#ui-clues')) ?? '').includes('3/5'), 'badge persiste Pistas 3/5');

  ok(pageErrors.length === 0, `sem erros de página${pageErrors[0] ? ` (1º: ${pageErrors[0]})` : ''}`);
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}

console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK');
process.exit(fails.length ? 1 : 0);
