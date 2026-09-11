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
  
  // Read persistent setting: default to disabled (false) if not set
  const storedAuth   = localStorage.getItem('ultimatetv_pin_enabled') ?? localStorage.getItem('ultimatetv_access_control');
  const isPinEnabled = storedAuth === 'true' || storedAuth === 'enabled';
  toggleAuth.value   = isPinEnabled ? 'true' : 'false';
  inputPin.value     = localStorage.getItem('ultimatetv_admin_pin') || '1234';

  // ── Focusable elements in D-Pad order ──────────────────────────
  // Indices 0-3: left column fields; 4-6: right column buttons
  const focusables = [inputServer, selectOsd, toggleAuth, inputPin, btnSave, btnCancel, btnUpdate];
  let currentIndex = 0;

  function updatePinRowState(focusPin = false) {
    const isEnabled = toggleAuth.value === 'true';
    const pinRow = document.querySelector('.cfg-row[data-index="3"]');
    if (pinRow) {
      pinRow.style.opacity = isEnabled ? '1' : '0.4';
      pinRow.style.pointerEvents = isEnabled ? 'auto' : 'none';
    }
    inputPin.disabled = !isEnabled;
    if (isEnabled && focusPin) {
      focusAt(3);
      inputPin.select();
    }
  }

  function focusAt(idx) {
    if (idx < 0 || idx >= focusables.length) return;
    if (idx === 3 && inputPin.disabled) return;
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
  if (versionEl) versionEl.textContent = window.APP_VERSION || '1.0.S4';
  if (uaEl)      uaEl.textContent      = navigator.userAgent;

  // Initialize PIN row state and focus first field
  updatePinRowState(false);
  focusAt(0);

  // Toggle listener
  toggleAuth.addEventListener('change', () => {
    if (toggleAuth.value === 'true') {
      updatePinRowState(true);
    } else {
      updatePinRowState(false);
    }
  });

  // ── D-Pad navigation ───────────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < 3) {
          if (currentIndex === 2 && inputPin.disabled) {
            focusAt(4); // Jump directly to Save button when PIN is disabled
          } else {
            focusAt(currentIndex + 1);
          }
        } else if (currentIndex >= 4 && currentIndex < focusables.length - 1) {
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
          if (inputPin.disabled) {
            focusAt(2); // Jump back to toggleAuth when PIN is disabled
          } else {
            focusAt(3);
          }
        }
        break;

      case 'ArrowRight':
        if (document.activeElement === toggleAuth) {
          e.preventDefault();
          toggleAuth.value = 'true';
          toggleAuth.dispatchEvent(new Event('change'));
          return;
        }
        if (document.activeElement === selectOsd) {
          e.preventDefault();
          if (selectOsd.selectedIndex < selectOsd.options.length - 1) {
            selectOsd.selectedIndex++;
            selectOsd.dispatchEvent(new Event('change'));
          }
          return;
        }
        e.preventDefault();
        if (currentIndex < 4) {
          focusAt(4);
        }
        break;

      case 'ArrowLeft':
        if (document.activeElement === toggleAuth) {
          e.preventDefault();
          toggleAuth.value = 'false';
          toggleAuth.dispatchEvent(new Event('change'));
          return;
        }
        if (document.activeElement === selectOsd) {
          e.preventDefault();
          if (selectOsd.selectedIndex > 0) {
            selectOsd.selectedIndex--;
            selectOsd.dispatchEvent(new Event('change'));
          }
          return;
        }
        e.preventDefault();
        if (currentIndex >= 4) {
          if (inputPin.disabled) {
            focusAt(2);
          } else {
            focusAt(3);
          }
        }
        break;

      case 'Enter':
        if (document.activeElement === btnSave)   { save(); return; }
        if (document.activeElement === btnCancel) { cancel(); return; }
        if (document.activeElement === btnUpdate) { update(); return; }
        if (currentIndex === 2) {
          if (inputPin.disabled) focusAt(4);
          else focusAt(3);
        } else if (currentIndex === 3) {
          focusAt(4);
        } else if (currentIndex < 2) {
          focusAt(currentIndex + 1);
        }
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

    const isPinActive = toggleAuth.value === 'true';
    localStorage.setItem('ultimatetv_pin_enabled', isPinActive ? 'true' : 'false');
    localStorage.setItem('ultimatetv_access_control', isPinActive ? 'true' : 'false');

    let pin = inputPin.value.trim();
    if (isPinActive) {
      if (pin.length !== 4 || isNaN(pin)) {
        focusAt(3);
        inputPin.focus();
        inputPin.style.borderColor = '#ef4444';
        setTimeout(() => {
          inputPin.style.borderColor = '';
        }, 1500);
        return;
      }
      localStorage.setItem('ultimatetv_admin_pin', pin);
    } else {
      if (pin.length === 4 && !isNaN(pin)) {
        localStorage.setItem('ultimatetv_admin_pin', pin);
      }
    }

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
