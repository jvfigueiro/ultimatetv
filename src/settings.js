document.addEventListener('DOMContentLoaded', () => {
  const inputServer = document.getElementById('input-server');
  const selectOsd = document.getElementById('select-osd');
  const toggleAuth = document.getElementById('toggle-auth');
  const inputPin = document.getElementById('input-pin');
  const btnSave = document.getElementById('btn-save');
  const btnCancel = document.getElementById('btn-cancel');
  const btnUpdate = document.getElementById('btn-update');

  // Carregar valores do localStorage
  inputServer.value = localStorage.getItem('ultimatetv_server') || 'http://10.0.7.25:9191';
  selectOsd.value = localStorage.getItem('ultimatetv_osd_timeout') || '7000';
  toggleAuth.value = localStorage.getItem('ultimatetv_access_control') || 'false';
  inputPin.value = localStorage.getItem('ultimatetv_admin_pin') || '1234';

  btnSave.addEventListener('click', () => {
    localStorage.setItem('ultimatetv_server', inputServer.value.trim());
    localStorage.setItem('ultimatetv_osd_timeout', selectOsd.value);
    localStorage.setItem('ultimatetv_access_control', toggleAuth.value);
    
    let pin = inputPin.value.trim();
    if (pin.length !== 4 || isNaN(pin)) pin = '1234';
    localStorage.setItem('ultimatetv_admin_pin', pin);

    window.location.href = 'index.html';
  });

  btnCancel.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  btnUpdate.addEventListener('click', () => {
    alert("Procurando por atualizações...");
    window.location.reload();
  });
  
  // Focar no primeiro input
  inputServer.focus();
});
