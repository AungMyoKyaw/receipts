async (page) => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:1421/');
  await page.waitForFunction(() => !document.querySelector('button[type="submit"]').disabled);
  const note = page.getByLabel('What are you working on?');
  const submit = page.locator('button[type="submit"]');
  await note.fill(' ');
  assert(await submit.isDisabled(), 'Empty notes must disable Start');
  await note.fill('a'.repeat(121));
  assert(await submit.isDisabled(), 'Notes over 120 characters must disable Start');
  await note.fill('Testing receipts');
  await note.press('Enter');
  await page.waitForFunction(() => document.querySelector('[role="timer"]').textContent !== '00:00:00');
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  assert(await page.getByText('Session saved · demo only').isVisible(), 'Stop must save a demo receipt');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.getByRole('link', { name: 'Try the timer', exact: true }).click();
  assert(await note.evaluate(el => document.activeElement === el), 'Primary action must focus the note');
  await page.getByRole('tab', { name: 'Log', exact: true }).click();
  await page.getByRole('tab', { name: 'Log', exact: true }).press('End');
  assert(await page.locator('#view-panel-stats').isVisible(), 'End must select Stats');
  await page.getByRole('tab', { name: 'Stats', exact: true }).press('Home');
  assert(await page.locator('#view-panel-log').isVisible(), 'Home must select Log');
  await page.getByRole('tab', { name: 'Log', exact: true }).press('ArrowRight');
  assert(await page.locator('#view-panel-week').isVisible(), 'ArrowRight must select Week');
  const question = page.locator('summary').first();
  await question.focus();
  await question.press('Enter');
  assert(await question.evaluate(el => el.parentElement.open), 'FAQ must work with the keyboard');
  await question.press('Enter');
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      timer: document.querySelector('[role="timer"]').getBoundingClientRect().right,
      button: document.querySelector('button[type="submit"]').getBoundingClientRect().left
    }));
    assert(layout.page <= width, `Page overflows at ${width}px`);
    assert(layout.timer <= layout.button, `Timer overlaps Start at ${width}px`);
  }
  assert(await page.evaluate(() => localStorage.length === 0), 'Demo must not write local records');
  assert(errors.length === 0, errors.join('\n'));
  return { status: 'pass', viewports: [320, 390, 768, 1024, 1440] };
}
