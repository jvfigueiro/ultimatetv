document.addEventListener('DOMContentLoaded', () => {
  const inputServer = document.getElementById('input-server');
  const selectOsd   = document.getElementById('select-osd');
  const toggleAuth  = document.getElementById('toggle-auth');
  const inputPin    = document.getElementById('input-pin');
  const btnSave     = document.getElementById('btn-save');
  const btnCancel   = document.getElementById('btn-cancel');
  const btnUpdate   = document.getElementById('btn-update');

  // ── Load stored values ──────────────────────────────────────────
  inputServer.value = localStorage.getItem('ultimatetv_server') || 'http://10.0.7.26:9191';
  selectOsd.value   = localStorage.getItem('ultimatetv_osd_timeout') || '7000';
  const storedAuth  = localStorage.getItem('ultimatetv_access_control');
  toggleAuth.value  = storedAuth === null ? 'true' : storedAuth;
  inputPin.value    = localStorage.getItem('ultimatetv_admin_pin') || '1234';

  // ── Focusable elements in D-Pad order ──────────────────────────
  // Indices 0-3: left column fields; 4-6: right column buttons
  const focusables = [inputServer, selectOsd, toggleAuth, inputPin, btnSave, btnCancel, btnUpdate];
  let currentIndex = 0;

  function focusAt(idx) {
    if (idx < 0 || idx >= focusables.length) return;
    currentIndex = idx;
    focusables[idx].focus();

    // Highlight the matching table row (indices 0-3)
    document.querySelectorAll('.cfg-row').forEach(r => r.classList.remove('focused'));
    if (idx < 4) {
      const row = document.querySelector(`.cfg-row[data-index="${idx}"]`);
      if (row) row.classList.add('focused');
    }
  }

  // ── Inject system info (read-only) ────────────────────────────
  const versionEl = document.getElementById('sysinfo-version');
  const uaEl      = document.getElementById('sysinfo-ua');
  if (versionEl) versionEl.textContent = window.APP_VERSION || '1.0.S3';
  if (uaEl)      uaEl.textContent      = navigator.userAgent;

  // Focus first field on boot
  focusAt(0);

  // ── D-Pad navigation ───────────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < 3) {
          // Down within left column
          focusAt(currentIndex + 1);
        } else if (currentIndex >= 4 && currentIndex < focusables.length - 1) {
          // Down within right buttons
          focusAt(currentIndex + 1);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0 && currentIndex <= 3) {
          focusAt(currentIndex - 1);
        } else if (currentIndex > 4) {
          focusAt(currentIndex - 1);
        } else if (currentIndex === 4) {
          // From top button, go back to last field
          focusAt(3);
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (currentIndex < 4) {
          // Left column → jump to Save button
          focusAt(4);
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        if (currentIndex >= 4) {
          // Right column → jump back to last left field
          focusAt(3);
        }
        break;

      case 'Enter':
        if (document.activeElement === btnSave)   { save(); return; }
        if (document.activeElement === btnCancel) { cancel(); return; }
        if (document.activeElement === btnUpdate) { update(); return; }
        // On fields, Enter moves to next item (or Save if on last field)
        if (currentIndex === 3) focusAt(4);
        else if (currentIndex < 3) focusAt(currentIndex + 1);
        break;

      case 'Backspace':
      case 'GoBack':
        cancel();
        break;
    }
  });

  // ── Actions ────────────────────────────────────────────────────
  function save() {
    localStorage.setItem('ultimatetv_server', inputServer.value.trim());
    localStorage.setItem('ultimatetv_osd_timeout', selectOsd.value);
    localStorage.setItem('ultimatetv_access_control', toggleAuth.value);

    let pin = inputPin.value.trim();
    if (pin.length !== 4 || isNaN(pin)) pin = '1234';
    localStorage.setItem('ultimatetv_admin_pin', pin);

    window.location.href = 'index.html';
  }

  function cancel() {
    window.location.href = 'index.html';
  }

  function update() {
    window.location.reload();
  }

  btnSave.addEventListener('click',   save);
  btnCancel.addEventListener('click', cancel);
  btnUpdate.addEventListener('click', update);
});
