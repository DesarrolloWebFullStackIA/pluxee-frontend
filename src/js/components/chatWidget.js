(function () {
  const root = document.querySelector('.chat-widget');
  if (!root) return;

  const history  = [];
  const panel    = root.querySelector('.chat-panel');
  const messages = root.querySelector('.chat-messages');
  const form     = root.querySelector('.chat-form');
  const input    = form.querySelector('input');
  const toggle   = root.querySelector('.chat-toggle');
  const closeBtn = root.querySelector('.chat-close');

  function open()  { panel.hidden = false; input.focus(); }
  function close() { panel.hidden = true; }

  toggle.addEventListener('click', () => panel.hidden ? open() : close());
  closeBtn.addEventListener('click', close);

  function escapar(t) {
    return String(t)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function tablaHTML(tabla) {
    let html = '<div class="overflow-x-auto my-2"><table class="w-full text-sm border-collapse">';
    html += '<thead><tr>';
    tabla.columnas.forEach(c => {
      html += `<th class="bg-blue-600 text-white text-left px-3 py-2 border border-gray-200 font-semibold">${escapar(c)}</th>`;
    });
    html += '</tr></thead><tbody>';
    tabla.filas.forEach((fila, i) => {
      const bg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50';
      html += '<tr>';
      fila.forEach(c => {
        html += `<td class="${bg} px-3 py-2 border border-gray-200 text-gray-800">${escapar(c)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  function render(text) {
    const partes = String(text).split(/```json\n([\s\S]*?)\n```/g);
    let html = '';

    for (let i = 0; i < partes.length; i++) {
      if (i % 2 === 1) {
        try {
          const data = JSON.parse(partes[i]);
          if (data.tabla) html += tablaHTML(data.tabla);
        } catch (e) {
          html += escapar(partes[i]);
        }
      } else {
        html += escapar(partes[i]).replace(/\n/g, '<br>');
      }
    }
    return html;
  }

  function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `chat-msg chat-msg--${role}`;
    div.innerHTML = render(text);
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  addMessage('model', 'Hola 👋 Soy el asistente de Pluxee Enterprise. ¿En qué puedo ayudarte con la gestión de beneficios?');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMessage('user', text);
    const loading = addMessage('model', 'Pensando...');

    try {
      const { data } = await axios.post('http://127.0.0.1:8000/chat', {
        message: text,
        history
      });
      history.push({ role: 'user', text }, { role: 'model', text: data.reply });
      loading.innerHTML = render(data.reply);

      if (data.pdf_url) {
        const boton = document.createElement('a');
        boton.href = 'http://127.0.0.1:8000' + data.pdf_url
          + '?titulo=' + encodeURIComponent(data.pdf_titulo || 'informe');
        boton.target = '_blank';
        boton.rel = 'noopener';
        boton.className = 'chat-pdf-link';
        boton.textContent = '📄 Descargar PDF';
        messages.appendChild(boton);
        messages.scrollTop = messages.scrollHeight;
      }
    } catch (err) {
      console.error(err);
      loading.textContent = 'No he podido responder. Inténtalo de nuevo.';
    }

    messages.scrollTop = messages.scrollHeight;
  });
})();