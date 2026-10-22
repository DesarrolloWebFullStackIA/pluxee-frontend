(function () {
  const root = document.querySelector('.chat-widget');
  if (!root) return;


  if (!document.getElementById('chat-tabla-styles')) {
    const style = document.createElement('style');
    style.id = 'chat-tabla-styles';
    style.textContent = `
      .chat-widget .chat-panel:has(.chat-msg--tabla) { width: 520px; max-width: calc(100vw - 40px); }
      .chat-widget .chat-msg--tabla { max-width: 100%; width: 100%; min-width: 0; box-sizing: border-box; }
      .chat-widget .chat-tabla-wrap { max-width: 100%; overflow-x: scroll; margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; }
      .chat-widget .chat-tabla { width: 100%; border-collapse: collapse; font-size: 12px; }
      .chat-widget .chat-tabla th { background: #2563eb; color: #fff; text-align: left; font-weight: 600; padding: 6px 8px; white-space: nowrap; }
      .chat-widget .chat-tabla td { padding: 5px 8px; border-top: 1px solid #e5e7eb; color: #1f2937; background: #fff; white-space: nowrap; }
      .chat-widget .chat-tabla-wrap::-webkit-scrollbar { height: 10px; }
      .chat-widget .chat-tabla-wrap::-webkit-scrollbar-track { background: #e2e8f0; border-radius: 5px; }
      .chat-widget .chat-tabla-wrap::-webkit-scrollbar-thumb { background: #64748b; border-radius: 5px; }
      .chat-widget .chat-tabla-hint { font-size: 11px; color: #475569; margin-top: 4px; }
      .chat-widget .chat-tabla tbody tr:nth-child(even) td { background: #f1f5f9; }
    `;
    document.head.appendChild(style);
  }

  const history  = [];
  const panel    = root.querySelector('.chat-panel');
  const messages = root.querySelector('.chat-messages');
  const form     = root.querySelector('.chat-form');
  const input    = form.querySelector('input');
  const toggle   = root.querySelector('.chat-toggle');
  const closeBtn = root.querySelector('.chat-close');

  const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

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

  
  const ETIQUETAS = {
    first_name: 'Nombre',
    last_name: 'Apellido',
    name: 'Nombre',
    email: 'Email',
    department: 'Departamento',
    role: 'Cargo',
    position: 'Cargo',
    employee: 'Empleado',
    category: 'Categoría',
    concept: 'Concepto',
    description: 'Descripción',
    amount: 'Importe',
    date: 'Fecha',
    status: 'Estado',
    assigned_amount: 'Importe asignado',
    max_budget: 'Presupuesto máx.',
    total: 'Total',
    total_spent: 'Total gastado',
    total_amount: 'Importe total',
    num_expenses: 'Nº de gastos'
  };

 
  const VALORES = {
    PENDING: 'Pendiente',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado'
  };

  function etiqueta(columna) {
    const clave = String(columna).toLowerCase();
    if (ETIQUETAS[clave]) return ETIQUETAS[clave];
    const texto = String(columna).replace(/_/g, ' ').trim();
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function tablaHTML(tabla) {
  
    let visibles = tabla.columnas
      .map((c, i) => i)
      .filter(i => !/^(id|.+_id|created_at|updated_at)$/i.test(String(tabla.columnas[i])));
    if (visibles.length === 0) visibles = tabla.columnas.map((c, i) => i);

    let html = '<div class="chat-tabla-wrap"><table class="chat-tabla">';
    html += '<thead><tr>';
    visibles.forEach(i => {
      html += `<th>${escapar(etiqueta(tabla.columnas[i]))}</th>`;
    });
    html += '</tr></thead><tbody>';
    tabla.filas.forEach(fila => {
      html += '<tr>';
      visibles.forEach(i => {
        const valor = fila[i] ?? '';
        html += `<td>${escapar(VALORES[valor] ?? valor)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  
  function render(text) {
    return escapar(text).replace(/\n/g, '<br>');
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
      const { data } = await axios.post(API_BASE_URL + '/chat/', {
        message: text,
        history
      });

      history.push({ role: 'user', text }, { role: 'model', text: data.reply });
      loading.innerHTML = render(data.reply);

      if (data.tabla && Array.isArray(data.tabla.filas)) {
        loading.classList.add('chat-msg--tabla');
        loading.insertAdjacentHTML('beforeend', tablaHTML(data.tabla));

      
        const wrap = loading.querySelector('.chat-tabla-wrap');
        if (wrap && wrap.scrollWidth > wrap.clientWidth + 1) {
          wrap.insertAdjacentHTML('afterend', '<div class="chat-tabla-hint">↔ Desliza la tabla para ver más columnas</div>');
        }
      }

      if (data.pdf_url) {
        const boton = document.createElement('a');
        boton.href = API_BASE_URL + data.pdf_url;
        boton.target = '_blank';
        boton.rel = 'noopener';
        boton.className = 'chat-pdf-link';
        boton.textContent = '📄 Descargar PDF';
        messages.appendChild(boton);
      }
    } catch (err) {
      console.error(err);
      loading.textContent = 'No he podido responder. Inténtalo de nuevo.';
    }

    messages.scrollTop = messages.scrollHeight;
  });
})();