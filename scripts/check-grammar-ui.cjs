const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
app.setPath('userData', path.resolve('node_modules/.tmp/grammar-ui-profile'));
app.disableHardwareAcceleration();
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1100, height: 900, webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } });
  const errors = [];
  win.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
  const run = code => win.webContents.executeJavaScript(code, true);
  const text = () => run('document.body.innerText');
  const click = async label => {
    const found = await run(`(() => { const node = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(label)}); if (!node || node.disabled) return false; node.click(); return true; })()`);
    if (!found) throw new Error(`Missing button: ${label}\n${await text()}`);
    await delay(120);
  };
  try {
    await win.loadURL('http://127.0.0.1:5174');
    await delay(700);
    await click('Начать тренировку');
    await click('Грамматика');
    // The first topic is expanded by default.
    await click('Читать');
    await click('Перейти к упражнениям · 21 задание');
    await delay(200);
    if (!(await text()).includes('Задание 1 из 7')) throw Error('Exercises did not load');
    win.setContentSize(1090, 890);
    win.webContents.invalidate();
    await delay(600);
    fs.writeFileSync('node_modules/.tmp/grammar-desktop.jpg', (await win.webContents.capturePage()).resize({ width: 800 }).toJPEG(75));
    // Freely switch before submission, preserving a draft and a checked answer.
    await click('2. Ввод (7)');
    await run(`(() => { const input = document.querySelector('input[name="grammar-answer"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'draft answer'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await delay(80);
    await click('3. Ошибка (7)');
    await click('2. Ввод (7)');
    if (await run(`document.querySelector('input[name="grammar-answer"]').value`) !== 'draft answer') throw Error('Lost draft on tab switch');
    await click('Проверить ответ');
    await click('1. Тест (7)');
    await click('2. Ввод (7)');
    if (!await run(`document.querySelector('input[name="grammar-answer"]').disabled`)) throw Error('Lost submitted answer');
    await click('Следующее задание');
    await click('3. Ошибка (7)');
    await click('2. Ввод (7)');
    if (!(await text()).includes('Задание 2 из 7')) throw Error('Lost question position');
    await click('Новый набор · 21');

    // Complete all three blocks; deliberately use a wrong fill answer to exercise explanations.
    for (let i = 0; i < 21; i++) {
      const hasInput = await run(`Boolean(document.querySelector('input[name="grammar-answer"]'))`);
      if (hasInput) {
        await run(`(() => { const input = document.querySelector('input[name="grammar-answer"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'wrong'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      } else {
        await run(`(() => { const buttons = [...document.querySelectorAll('button')]; const check = buttons.find(b => b.textContent.trim() === 'Проверить ответ'); const card = check.closest('[class*="backdrop-blur-2xl"]'); const options = card.querySelectorAll('div.grid button'); if (!options[0]) throw Error('No answer options'); options[0].click(); })()`);
      }
      await delay(80);
      await click('Проверить ответ');
      if (i === 6) {
        await click('Ещё 7 заданий этого вида');
        if (!(await text()).includes('Задание 1 из 7')) throw Error('Single exercise regeneration failed');
        // Complete the replacement block.
        for (let j = 0; j < 7; j++) {
          await run(`(() => { const check = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Проверить ответ'); check.closest('[class*="backdrop-blur-2xl"]').querySelector('div.grid button').click(); })()`);
          await delay(60);
          await click('Проверить ответ');
          if (j < 6) await click('Следующее задание');
        }
      }
      await click(i === 6 ? 'К виду 2 (Ввод формы) →' : i === 13 ? 'К виду 3 (Поиск ошибки) →' : i === 20 ? 'Завершить практику' : 'Следующее задание');
    }
    if (!(await text()).includes('Итоговый результат:')) throw Error('No completion result');
    const progress = await run(`JSON.parse(localStorage.getItem('vocab_grammar_progress_v2'))`);
    const score = Object.values(progress.passedExercises)[0];
    if (score.maxPossible !== 21 || score.totalScore > 21) throw Error('Invalid persisted score');
    await click('Сгенерировать новые (21 шт)');
    if (!(await text()).includes('Задание 1 из 7')) throw Error('Full regeneration failed');
    // Finish a fresh set in reverse order: the last answered type must be able to finish.
    for (const tab of ['3. Ошибка (7)', '2. Ввод (7)', '1. Тест (7)']) {
      await click(tab);
      for (let index = 0; index < 7; index++) {
        await run(`(() => {
          const input = document.querySelector('input[name="grammar-answer"]');
          if (input) {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'wrong');
            input.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            const check = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Проверить ответ');
            check.closest('[class*="backdrop-blur-2xl"]').querySelector('div.grid button').click();
          }
        })()`);
        await delay(60);
        await click('Проверить ответ');
        if (index < 6) await click('Следующее задание');
      }
      if (tab === '3. Ошибка (7)') {
        await click('К виду 1 (Выбор ответа) →');
        if ((await text()).includes('Итоговый результат:')) throw Error('Finished before all types');
      }
    }
    await click('Завершить практику');
    if (!(await text()).includes('Итоговый результат:')) throw Error('Reverse completion failed');
    const reverseScore = await run(`Object.values(JSON.parse(localStorage.getItem('vocab_grammar_progress_v2')).passedExercises)[0]`);
    if (reverseScore.maxPossible !== 21 || reverseScore.totalScore > 21) throw Error('Invalid score after tab switching');
    await click('Сгенерировать новые (21 шт)');
    win.setContentSize(390, 844);
    await delay(300);
    const dimensions = await run(`({ width: innerWidth, scroll: document.documentElement.scrollWidth })`);
    if (dimensions.scroll > dimensions.width) throw Error(`Mobile overflow: ${JSON.stringify(dimensions)}`);
    fs.writeFileSync('node_modules/.tmp/grammar-mobile.png', (await win.webContents.capturePage()).toPNG());
    console.log(JSON.stringify({ result: 'passed', checked: 'lecture entry, free tabs, preserved draft/answer/index, sequential and reverse completion, regeneration, 21-point score, mobile width', score, errors }));
    app.exit(0);
  } catch (error) {
    console.error(error);
    console.error(await text());
    app.exit(1);
  }
});
