// =============================================
// CONFIGURACIÓN SUPABASE
// =============================================
const SUPABASE_URL = 'https://iswemyldthxvdngzpskt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_eRt5tBUER-2ZcV_mvAuftA_34Z1jrWF';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================================
// COMPONENTES DE LITOGRAFÍA
// =============================================
const COMPONENTES = [
  'Diseño',
  'CTP',
  'Papel carátula',
  'Papel interior',
  'Impresión litográfica',
  'Impresión digital',
  'Numeración',
  'Acabado',
  'Troquel',
  'Troquelado',
  'Laminado',
  'Cortes y ref.',
  'Sanduchado',
  'Argollado',
  'Levantado',
  'Plegado',
  'Estampado',
  'Instalación',
  'Fletes',
  'Otros'
];

// =============================================
// NAVEGACIÓN
// =============================================
let ordenActualId = null;

function mostrarPantalla(id) {
  document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
  document.getElementById(id).classList.add('activa');

  if (id === 'pantalla-inicio') cargarOrdenes();
  if (id === 'pantalla-nueva-orden') inicializarFormulario();
}

function volverADetalle() {
  if (ordenActualId) cargarDetalle(ordenActualId);
  mostrarPantalla('pantalla-detalle');
}

// =============================================
// PANTALLA: NUEVA COTIZACIÓN
// =============================================
function inicializarFormulario() {
  const contenedor = document.getElementById('componentes-lista');
  contenedor.innerHTML = '';

  COMPONENTES.forEach(comp => {
    const fila = document.createElement('div');
    fila.className = 'componente-fila';
    fila.innerHTML = `
      <label>${comp}</label>
      <input type="number" id="comp-${comp}" placeholder="$0" min="0" onchange="calcularTotal()" />
    `;
    contenedor.appendChild(fila);
  });

  // Mostrar/ocultar retefuente
  document.getElementById('aplica-rete').addEventListener('change', function () {
    document.getElementById('fila-rete').style.display = this.checked ? 'flex' : 'none';
    document.getElementById('fila-res-rete').style.display = this.checked ? 'flex' : 'none';
    calcularTotal();
  });

  calcularTotal();
}

function calcularTotal() {
  let costoBase = 0;
  COMPONENTES.forEach(comp => {
    const input = document.getElementById(`comp-${comp}`);
    if (input) costoBase += parseFloat(input.value) || 0;
  });

  const pctIndirectos = parseFloat(document.getElementById('pct-indirectos').value) / 100 || 0;
  const pctMargen = parseFloat(document.getElementById('pct-margen').value) / 100 || 0;
  const aplicaRete = document.getElementById('aplica-rete').checked;
  const pctRete = parseFloat(document.getElementById('pct-rete').value) / 100 || 0;

  const indirectos = costoBase * pctIndirectos;
  const subtotal1 = costoBase + indirectos;
  const margen = subtotal1 * pctMargen;
  const subtotal2 = subtotal1 + margen;
  const rete = aplicaRete ? subtotal2 * pctRete : 0;
  const total = subtotal2 + rete;

  document.getElementById('res-costo-base').textContent = formatPesos(costoBase);
  document.getElementById('res-indirectos').textContent = `+${formatPesos(indirectos)}`;
  document.getElementById('res-margen').textContent = `+${formatPesos(margen)}`;
  document.getElementById('res-rete').textContent = `+${formatPesos(rete)}`;
  document.getElementById('res-total').textContent = formatPesos(total);
}

async function guardarCotizacion() {
  const cliente = document.getElementById('cliente').value.trim();
  if (!cliente) { alert('Por favor escribe el nombre del cliente'); return; }

  const numeroOrden = generarNumeroOrden();

  let costoBase = 0;
  const items = [];
  COMPONENTES.forEach(comp => {
    const input = document.getElementById(`comp-${comp}`);
    const valor = parseFloat(input?.value) || 0;
    if (valor > 0) {
      items.push({ componente: comp, valor });
      costoBase += valor;
    }
  });

  const pctIndirectos = parseFloat(document.getElementById('pct-indirectos').value) || 12;
  const pctMargen = parseFloat(document.getElementById('pct-margen').value) || 30;
  const aplicaRete = document.getElementById('aplica-rete').checked;
  const pctRete = parseFloat(document.getElementById('pct-rete').value) || 6;

  const indirectos = costoBase * (pctIndirectos / 100);
  const subtotal1 = costoBase + indirectos;
  const margen = subtotal1 * (pctMargen / 100);
  const subtotal2 = subtotal1 + margen;
  const rete = aplicaRete ? subtotal2 * (pctRete / 100) : 0;
  const precioSugerido = subtotal2 + rete;

  // Guardar orden
  const { data: orden, error } = await db.from('ordenes').insert([{
    numero_orden: numeroOrden,
    cliente,
    descripcion: document.getElementById('descripcion').value.trim(),
    fecha_entrega: document.getElementById('fecha-entrega').value || null,
    porcentaje_indirectos: pctIndirectos,
    porcentaje_margen: pctMargen,
    aplica_retefuente: aplicaRete,
    porcentaje_retefuente: pctRete,
    precio_sugerido: precioSugerido,
    estado: 'cotizacion'
  }]).select().single();

  if (error) { alert('Error guardando: ' + error.message); return; }

  // Guardar items
  if (items.length > 0) {
    const itemsConId = items.map(i => ({ ...i, orden_id: orden.id }));
    await db.from('cotizacion_items').insert(itemsConId);
  }

  alert(`✅ Cotización guardada!\nNúmero de orden: ${numeroOrden}`);
  ordenActualId = orden.id;
  cargarDetalle(orden.id);
  mostrarPantalla('pantalla-detalle');
}

// =============================================
// PANTALLA: LISTA DE ÓRDENES
// =============================================
async function cargarOrdenes() {
  const contenedor = document.getElementById('lista-ordenes');
  contenedor.innerHTML = '<p class="cargando">Cargando...</p>';

  const { data, error } = await db
    .from('ordenes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    contenedor.innerHTML = '<p class="cargando">No hay órdenes aún. ¡Crea la primera!</p>';
    return;
  }

  contenedor.innerHTML = '';
  data.forEach(orden => {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'tarjeta-orden';
    tarjeta.onclick = () => {
      ordenActualId = orden.id;
      cargarDetalle(orden.id);
      mostrarPantalla('pantalla-detalle');
    };
    tarjeta.innerHTML = `
      <div class="orden-numero">${orden.numero_orden}</div>
      <div class="orden-cliente">${orden.cliente}</div>
      <div class="orden-descripcion">${orden.descripcion || ''}</div>
      <div class="orden-footer">
        <span>${orden.fecha_entrega ? '📅 ' + orden.fecha_entrega : ''}</span>
        <span class="badge ${orden.estado}">${orden.estado}</span>
      </div>
    `;
    contenedor.appendChild(tarjeta);
  });
}

// =============================================
// PANTALLA: DETALLE DE ORDEN
// =============================================
async function cargarDetalle(ordenId) {
  ordenActualId = ordenId;
  const { data: orden } = await db.from('ordenes').select('*').eq('id', ordenId).single();
  const { data: items } = await db.from('cotizacion_items').select('*').eq('orden_id', ordenId);

  document.getElementById('detalle-titulo').textContent = orden.numero_orden;

  let itemsHTML = '';
  let costoBase = 0;
  (items || []).forEach(item => {
    costoBase += item.valor;
    itemsHTML += `<div class="fila-resumen"><span>${item.componente}</span><span>${formatPesos(item.valor)}</span></div>`;
  });

  const contenido = document.getElementById('detalle-contenido');
  contenido.innerHTML = `
    <div class="analisis-card azul">
      <div>Cliente</div>
      <div class="valor" style="font-size:20px">${orden.cliente}</div>
    </div>
    ${orden.descripcion ? `<p>${orden.descripcion}</p>` : ''}
    ${orden.fecha_entrega ? `<p>📅 Entrega: ${orden.fecha_entrega}</p>` : ''}

    <h3>💰 Cotización</h3>
    <div class="resumen-cotizacion">
      ${itemsHTML}
      <div class="fila-resumen"><span>Costo base</span><span>${formatPesos(costoBase)}</span></div>
      <div class="fila-resumen"><span>+ Indirectos (${orden.porcentaje_indirectos}%)</span><span>${formatPesos(costoBase * orden.porcentaje_indirectos / 100)}</span></div>
      <div class="fila-resumen"><span>+ Margen (${orden.porcentaje_margen}%)</span><span>${formatPesos(costoBase * (1 + orden.porcentaje_indirectos/100) * orden.porcentaje_margen / 100)}</span></div>
      ${orden.aplica_retefuente ? `<div class="fila-resumen"><span>+ Retefuente (${orden.porcentaje_retefuente}%)</span><span>${formatPesos(orden.precio_sugerido * orden.porcentaje_retefuente / 100)}</span></div>` : ''}
      <div class="fila-resumen total"><span>PRECIO A COBRAR</span><span>${formatPesos(orden.precio_sugerido)}</span></div>
    </div>

    <button class="btn-whatsapp" onclick="compartirWhatsApp(${JSON.stringify(orden).replace(/"/g, '&quot;')}, ${JSON.stringify(items || []).replace(/"/g, '&quot;')})">
      📱 Enviar por WhatsApp
    </button>

    <button class="btn-principal naranja" onclick="mostrarPantalla('pantalla-gastos'); inicializarGastos(${ordenId})">
      💸 Registrar Gastos Reales
    </button>

    ${orden.cobrado_real ? `
    <button class="btn-principal verde" onclick="mostrarPantalla('pantalla-analisis'); cargarAnalisis(${ordenId})">
      📊 Ver Análisis de Ganancia
    </button>` : ''}
  `;
}

// =============================================
// WHATSAPP
// =============================================
function compartirWhatsApp(orden, items) {
  let mensaje = `*COTIZACIÓN LITOGRAFÍA*\n`;
  mensaje += `━━━━━━━━━━━━━━━━━━\n`;
  mensaje += `📋 Orden: ${orden.numero_orden}\n`;
  mensaje += `👤 Cliente: ${orden.cliente}\n`;
  if (orden.descripcion) mensaje += `📦 Pedido: ${orden.descripcion}\n`;
  if (orden.fecha_entrega) mensaje += `📅 Entrega: ${orden.fecha_entrega}\n`;
  mensaje += `━━━━━━━━━━━━━━━━━━\n`;
  mensaje += `*DETALLE DE COSTOS:*\n`;
  items.forEach(item => {
    mensaje += `• ${item.componente}: ${formatPesos(item.valor)}\n`;
  });
  mensaje += `━━━━━━━━━━━━━━━━━━\n`;
  mensaje += `💰 *TOTAL A COBRAR: ${formatPesos(orden.precio_sugerido)}*\n`;
  mensaje += `\n_Gracias por su preferencia_ 🙏`;

  const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}

// =============================================
// PANTALLA: GASTOS REALES
// =============================================
function inicializarGastos(ordenId) {
  ordenActualId = ordenId;
  document.getElementById('gastos-orden-info').textContent = `Orden #${ordenId}`;

  const contenedor = document.getElementById('gastos-lista');
  contenedor.innerHTML = '';

  COMPONENTES.forEach(comp => {
    const fila = document.createElement('div');
    fila.className = 'componente-fila';
    fila.innerHTML = `
      <label>${comp}</label>
      <input type="number" id="gasto-${comp}" placeholder="$0" min="0" onchange="calcularTotalGasto()" />
    `;
    contenedor.appendChild(fila);
  });
}

function calcularTotalGasto() {
  let total = 0;
  COMPONENTES.forEach(comp => {
    const input = document.getElementById(`gasto-${comp}`);
    if (input) total += parseFloat(input.value) || 0;
  });
  document.getElementById('gasto-total').textContent = formatPesos(total);
}

async function guardarGastos() {
  const cobradoReal = parseFloat(document.getElementById('cobrado-real').value) || 0;
  if (cobradoReal === 0) { alert('Por favor escribe cuánto pagó el cliente'); return; }

  const gastos = [];
  COMPONENTES.forEach(comp => {
    const input = document.getElementById(`gasto-${comp}`);
    const valor = parseFloat(input?.value) || 0;
    if (valor > 0) gastos.push({ componente: comp, valor, orden_id: ordenActualId });
  });

  // Borrar gastos anteriores si existían
  await db.from('gasto_items').delete().eq('orden_id', ordenActualId);

  if (gastos.length > 0) await db.from('gasto_items').insert(gastos);

  await db.from('ordenes').update({
    cobrado_real: cobradoReal,
    estado: 'cerrada'
  }).eq('id', ordenActualId);

  alert('✅ Gastos guardados correctamente');
  cargarDetalle(ordenActualId);
  mostrarPantalla('pantalla-detalle');
}

// =============================================
// PANTALLA: ANÁLISIS
// =============================================
async function cargarAnalisis(ordenId) {
  ordenActualId = ordenId;
  const { data: orden } = await db.from('ordenes').select('*').eq('id', ordenId).single();
  const { data: gastos } = await db.from('gasto_items').select('*').eq('orden_id', ordenId);

  let totalGastado = 0;
  (gastos || []).forEach(g => totalGastado += g.valor);

  const cobrado = orden.cobrado_real || 0;
  const ganancia = cobrado - totalGastado;
  const margenReal = cobrado > 0 ? (ganancia / cobrado * 100) : 0;
  const margenEsperado = orden.porcentaje_margen;
  const cumplio = margenReal >= margenEsperado;

  const contenido = document.getElementById('analisis-contenido');
  contenido.innerHTML = `
    <div class="analisis-card azul">
      <div>💰 Cobrado al cliente</div>
      <div class="valor">${formatPesos(cobrado)}</div>
    </div>
    <div class="analisis-card rojo">
      <div>💸 Total gastado</div>
      <div class="valor">${formatPesos(totalGastado)}</div>
    </div>
    <div class="analisis-card ${ganancia >= 0 ? 'verde' : 'rojo'}">
      <div>✅ Ganancia neta</div>
      <div class="valor">${formatPesos(ganancia)}</div>
    </div>
    <div class="analisis-card ${cumplio ? 'verde' : 'rojo'}">
      <div>📊 Margen real vs esperado</div>
      <div class="valor">${margenReal.toFixed(1)}% vs ${margenEsperado}%</div>
      <div>${cumplio ? '✅ ¡Objetivo cumplido!' : '⚠️ Por debajo del objetivo'}</div>
    </div>
    <div class="resumen-cotizacion">
      <div class="fila-resumen"><span>Precio sugerido cotización</span><span>${formatPesos(orden.precio_sugerido)}</span></div>
      <div class="fila-resumen"><span>Cobrado real</span><span>${formatPesos(cobrado)}</span></div>
      <div class="fila-resumen total"><span>Diferencia</span><span>${formatPesos(cobrado - orden.precio_sugerido)}</span></div>
    </div>
  `;
}

// =============================================
// UTILIDADES
// =============================================
function generarNumeroOrden() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${year}${month}${day}-${random}`;
}

function formatPesos(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(valor || 0);
}

// Iniciar app
cargarOrdenes();