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
  'Fletes'
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
  if (id === 'pantalla-dashboard') cargarDashboard();
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

let contadorOtros = 0;

function agregarOtro() {
  contadorOtros++;
  const contenedor = document.getElementById('otros-lista');
  const fila = document.createElement('div');
  fila.className = 'componente-fila';
  fila.id = `otro-fila-${contadorOtros}`;
  fila.innerHTML = `
    <input type="text" placeholder="Concepto" 
      style="flex:1;padding:10px;border:2px solid #e2e8f0;border-radius:8px;font-size:15px;margin-right:8px" />
    <input type="number" placeholder="$0" min="0" 
      class="otro-valor"
      style="width:110px;padding:10px;border:2px solid #e2e8f0;border-radius:8px;font-size:15px;text-align:right"
      onchange="calcularTotal()" />
    <button onclick="eliminarOtro(${contadorOtros})" 
      style="background:none;border:none;color:#e53e3e;font-size:20px;cursor:pointer;margin-left:8px">✕</button>
  `;
  contenedor.appendChild(fila);
}

function eliminarOtro(id) {
  const fila = document.getElementById(`otro-fila-${id}`);
  if (fila) { fila.remove(); calcularTotal(); }
}

let contadorCamposPDF = 0;

function agregarCampoPDF() {
  contadorCamposPDF++;
  const contenedor = document.getElementById('campos-extra-pdf');
  const fila = document.createElement('div');
  fila.className = 'componente-fila';
  fila.id = `campo-pdf-${contadorCamposPDF}`;
  fila.innerHTML = `
    <input type="text" placeholder="Nombre del campo" 
      style="flex:1;padding:10px;border:2px solid #e2e8f0;border-radius:8px;font-size:15px;margin-right:8px" />
    <input type="text" placeholder="Valor" 
      style="flex:1;padding:10px;border:2px solid #e2e8f0;border-radius:8px;font-size:15px;margin-right:8px" />
    <button onclick="document.getElementById('campo-pdf-${contadorCamposPDF}').remove()" 
      style="background:none;border:none;color:#e53e3e;font-size:20px;cursor:pointer">✕</button>
  `;
  contenedor.appendChild(fila);
}

function recopilarCamposPDF() {
  const campos = {
    trabajo: document.getElementById('pdf-trabajo')?.value.trim() || '',
    tamano: document.getElementById('pdf-tamano')?.value.trim() || '',
    tintaInterna: document.getElementById('pdf-tinta-interna')?.value.trim() || '',
    tintaCaratula: document.getElementById('pdf-tinta-caratula')?.value.trim() || '',
    papelCaratula: document.getElementById('pdf-papel-caratula')?.value.trim() || '',
    papelInterior: document.getElementById('pdf-papel-interior')?.value.trim() || '',
    acabado: document.getElementById('pdf-acabado')?.value.trim() || '',
    pago: document.getElementById('pdf-pago')?.value.trim() || '',
    extras: []
  };

  document.querySelectorAll('#campos-extra-pdf .componente-fila').forEach(fila => {
    const inputs = fila.querySelectorAll('input');
    const nombre = inputs[0]?.value.trim();
    const valor = inputs[1]?.value.trim();
    if (nombre && valor) campos.extras.push({ nombre, valor });
  });

  return campos;
}

function calcularTotal() {
  let costoBase = 0;
  COMPONENTES.forEach(comp => {
    const input = document.getElementById(`comp-${comp}`);
    if (input) costoBase += parseFloat(input.value) || 0;
  });

  // Sumar otros conceptos
  document.querySelectorAll('.otro-valor').forEach(input => {
    costoBase += parseFloat(input.value) || 0;
  });

  const cantidad = parseFloat(document.getElementById('cantidad')?.value) || 1;
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
  const unitario = cantidad > 0 ? total / cantidad : 0;
  document.getElementById('res-unitario').textContent = formatPesos(unitario);
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

  // Guardar otros conceptos
  document.querySelectorAll('#otros-lista .componente-fila').forEach(fila => {
    const nombre = fila.querySelector('input[type="text"]')?.value.trim();
    const valor = parseFloat(fila.querySelector('.otro-valor')?.value) || 0;
    if (nombre && valor > 0) {
      items.push({ componente: nombre, valor });
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
    cantidad: parseFloat(document.getElementById('cantidad').value) || 1,
    campos_pdf: recopilarCamposPDF(),
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
    <button class="btn-principal" style="background:#e53e3e;font-size:14px;padding:10px" onclick="borrarOrden(${ordenId})">
      🗑️ Borrar esta cotización
    </button>
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
    <div id="resumen-abonos-${ordenId}"></div>

    <button class="btn-principal" style="background:#c05621" onclick="generarPDF(${ordenId})">
      📄 Generar PDF Cotización
    </button>

    <button class="btn-whatsapp" onclick="compartirWhatsApp(${JSON.stringify(orden).replace(/"/g, '&quot;')}, ${JSON.stringify(items || []).replace(/"/g, '&quot;')})">
      📱 Enviar por WhatsApp
    </button>

    <button class="btn-principal naranja" onclick="mostrarPantalla('pantalla-gastos'); inicializarGastos(${ordenId})">
      💸 Registrar Compra de Materiales
    </button>

    <button class="btn-principal" style="background:#6b46c1" onclick="mostrarPantalla('pantalla-abonos'); cargarAbonos(${ordenId})">
      💵 Registrar Abono
    </button>

    ${orden.cobrado_real ? `
    <button class="btn-principal verde" onclick="mostrarPantalla('pantalla-analisis'); cargarAnalisis(${ordenId})">
      📊 Ver Análisis de Ganancia
    </button>` : ''}
  `;
  cargarResumenAbonos(ordenId);
  cargarResumenGastosParciales(ordenId);
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
  document.getElementById('gastos-orden-info').textContent = `Registrar compra de materiales`;

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
  const gastos = [];
  const nota = document.getElementById('nota-gasto')?.value.trim() || '';

  COMPONENTES.forEach(comp => {
    const input = document.getElementById(`gasto-${comp}`);
    const valor = parseFloat(input?.value) || 0;
    if (valor > 0) gastos.push({ componente: comp, valor, orden_id: ordenActualId, nota });
  });

  // Gastos otros
  document.querySelectorAll('#gastos-otros-lista .componente-fila').forEach(fila => {
    const nombre = fila.querySelector('input[type="text"]')?.value.trim();
    const valor = parseFloat(fila.querySelector('.gasto-otro-valor')?.value) || 0;
    if (nombre && valor > 0) gastos.push({ componente: nombre, valor, orden_id: ordenActualId, nota });
  });

  if (gastos.length === 0) { alert('Por favor registra al menos un gasto'); return; }

  await db.from('gasto_items').insert(gastos);

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

// =============================================
// DASHBOARD / CUADRO DE CONTROL
// =============================================
async function cargarDashboard() {
  const contenedor = document.getElementById('dashboard-contenido');
  contenedor.innerHTML = '<p class="cargando">Cargando...</p>';

  const { data: ordenes } = await db.from('ordenes').select('*').order('fecha_entrega', { ascending: true });

  if (!ordenes) { contenedor.innerHTML = '<p class="cargando">Error cargando datos</p>'; return; }

  const total = ordenes.length;
  const pendientes = ordenes.filter(o => o.estado === 'cotizacion').length;
  const aprobadas = ordenes.filter(o => o.estado_aprobacion === 'aprobada').length;
  const cerradas = ordenes.filter(o => o.estado === 'cerrada').length;

  const hoy = new Date();
  const en3dias = new Date();
  en3dias.setDate(hoy.getDate() + 3);

  const proximasAVencer = ordenes.filter(o => {
    if (!o.fecha_entrega || o.estado === 'cerrada') return false;
    const fecha = new Date(o.fecha_entrega);
    return fecha <= en3dias && fecha >= hoy;
  });

  const vencidas = ordenes.filter(o => {
    if (!o.fecha_entrega || o.estado === 'cerrada') return false;
    const fecha = new Date(o.fecha_entrega);
    return fecha < hoy;
  });

  const totalCotizado = ordenes.reduce((sum, o) => sum + (o.precio_sugerido || 0), 0);
  const totalCobrado = ordenes.reduce((sum, o) => sum + (o.cobrado_real || 0), 0);

  const { data: todosGastos } = await db.from('gasto_items').select('valor, orden_id');
  const gastosPorOrden = {};
  (todosGastos || []).forEach(g => {
    gastosPorOrden[g.orden_id] = (gastosPorOrden[g.orden_id] || 0) + g.valor;
  });
  const totalUtilidades = ordenes
    .filter(o => o.cobrado_real > 0 && gastosPorOrden[o.id])
    .reduce((sum, o) => sum + (o.cobrado_real - gastosPorOrden[o.id]), 0);

  // Mes actual
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();
  const ordenesMes = ordenes.filter(o => {
    const fecha = new Date(o.created_at);
    return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual;
  });
  const cotizadoMes = ordenesMes.reduce((sum, o) => sum + (o.precio_sugerido || 0), 0);
  const cobradoMes = ordenesMes.reduce((sum, o) => sum + (o.cobrado_real || 0), 0);

  let alertasHTML = '';
  if (vencidas.length > 0) {
    alertasHTML += `<div class="analisis-card rojo">
      <div>🚨 Órdenes vencidas (${vencidas.length})</div>
      ${vencidas.map(o => `<div style="margin-top:8px;font-weight:bold">${o.numero_orden} - ${o.cliente}</div>`).join('')}
    </div>`;
  }
  if (proximasAVencer.length > 0) {
    alertasHTML += `<div class="analisis-card" style="border-color:#f6ad55;background:#fffaf0">
      <div>⚠️ Próximas a vencer (${proximasAVencer.length})</div>
      ${proximasAVencer.map(o => `<div style="margin-top:8px;font-weight:bold;color:#c05621">${o.numero_orden} - ${o.cliente} → ${o.fecha_entrega}</div>`).join('')}
    </div>`;
  }

  contenedor.innerHTML = `
    <h3>📅 Mes actual</h3>
    <div class="analisis-card azul">
      <div>💰 Cotizado este mes</div>
      <div class="valor">${formatPesos(cotizadoMes)}</div>
    </div>
    <div class="analisis-card verde">
      <div>✅ Cobrado este mes</div>
      <div class="valor">${formatPesos(cobradoMes)}</div>
    </div>

    <h3>📊 Resumen general</h3>
    <div class="resumen-cotizacion">
      <div class="fila-resumen"><span>Total órdenes</span><span>${total}</span></div>
      <div class="fila-resumen"><span>📝 En cotización</span><span>${pendientes}</span></div>
      <div class="fila-resumen"><span>✅ Aprobadas</span><span>${aprobadas}</span></div>
      <div class="fila-resumen"><span>🏁 Cerradas</span><span>${cerradas}</span></div>
      <div class="fila-resumen total"><span>Total cotizado</span><span>${formatPesos(totalCotizado)}</span></div>
      <div class="fila-resumen total"><span>Total cobrado</span><span>${formatPesos(totalCobrado)}</span></div>
      <div class="fila-resumen total" style="color:#276749"><span>💚 Total utilidades</span><span>${formatPesos(totalUtilidades)}</span></div>
    </div>

    ${alertasHTML}

    <h3>📋 Todas las órdenes</h3>
    ${ordenes.map(o => `
      <div class="tarjeta-orden">
        <div class="orden-numero">${o.numero_orden}</div>
        <div class="orden-cliente">${o.cliente}</div>
        <div class="orden-descripcion">${o.descripcion || ''}</div>
        <div class="orden-footer">
          <span class="badge ${o.estado}">${o.estado}</span>
          <span class="badge ${o.estado_aprobacion === 'aprobada' ? 'cerrada' : 'cotizacion'}">
            ${o.estado_aprobacion === 'aprobada' ? '✅ Aprobada' : '⏳ Pendiente'}
          </span>
        </div>
        ${o.estado !== 'cerrada' ? `
        <button class="btn-principal ${o.estado_aprobacion === 'aprobada' ? 'naranja' : 'verde'}" 
          style="margin-top:10px;font-size:14px;padding:10px"
          onclick="toggleAprobacion(${o.id}, '${o.estado_aprobacion}')">
          ${o.estado_aprobacion === 'aprobada' ? '↩️ Marcar como pendiente' : '✅ Marcar como aprobada'}
        </button>` : ''}
      </div>
    `).join('')}

    <h3>📥 Exportar datos</h3>
    <button class="btn-principal" onclick="exportarExcel()">
      📊 Descargar Excel con todas las órdenes
    </button>
  `;
}

async function toggleAprobacion(ordenId, estadoActual) {
  const nuevoEstado = estadoActual === 'aprobada' ? 'pendiente' : 'aprobada';
  await db.from('ordenes').update({ estado_aprobacion: nuevoEstado }).eq('id', ordenId);
  cargarDashboard();
}

// =============================================
// EXPORTAR A EXCEL
// =============================================
async function exportarExcel() {
  const { data: ordenes } = await db.from('ordenes').select('*').order('created_at', { ascending: false });

  if (!ordenes || ordenes.length === 0) { alert('No hay órdenes para exportar'); return; }

  const filas = [
    ['Número Orden', 'Cliente', 'Descripción', 'Fecha Entrega', 'Estado', 'Aprobación', 'Precio Sugerido', 'Cobrado Real', 'Ganancia', 'Margen Real %', 'Fecha Creación']
  ];

  ordenes.forEach(o => {
    const ganancia = (o.cobrado_real || 0) - 0;
    const margen = o.cobrado_real > 0 ? ((o.cobrado_real - 0) / o.cobrado_real * 100).toFixed(1) : '';
    filas.push([
      o.numero_orden,
      o.cliente,
      o.descripcion || '',
      o.fecha_entrega || '',
      o.estado,
      o.estado_aprobacion,
      o.precio_sugerido || 0,
      o.cobrado_real || 0,
      o.cobrado_real || 0,
      margen,
      new Date(o.created_at).toLocaleDateString('es-CO')
    ]);
  });

  // Convertir a CSV (compatible con Excel)
  const csv = filas.map(fila =>
    fila.map(celda => `"${String(celda).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `litografia_ordenes_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// =============================================
// GENERAR PDF
// =============================================

function cargarImagenBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function generarPDF(ordenId) {
  const { data: orden } = await db.from('ordenes').select('*').eq('id', ordenId).single();
  if (!orden) { alert('No se pudo cargar la orden'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const margenIzq = 20;
  const margenDer = 190;
  const ancho = margenDer - margenIzq;
  let y = 15;

  // Logo
  try {
    const logoImg = await cargarImagenBase64('./Logo_Digital_Center.png');
    doc.addImage(logoImg, 'PNG', margenIzq, y, 35, 30);
  } catch(e) { console.log('Logo no cargado:', e); }

  // Encabezado empresa
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Digital Center', 60, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('¡Imprime tus ideas!', 60, y + 14);
  doc.text('NIT: 1152467424-7', 60, y + 20);
  doc.text('TEL. 319 392 0654', 60, y + 26);
  doc.text('Medellín - Colombia', 60, y + 32);

  y += 45;

  // Fecha y cliente
  const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.setFontSize(10);
  doc.text(`Medellín, ${fechaHoy}`, margenIzq, y);
  y += 8;
  doc.text('Señores', margenIzq, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(orden.cliente.toUpperCase(), margenIzq, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('De acuerdo a su amable solicitud estamos cotizando el siguiente trabajo:', margenIzq, y);
  y += 10;

  // Línea separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(margenIzq, y, margenDer, y);
  y += 6;

  // Campos del PDF
  const campos = orden.campos_pdf || {};
  const camposBase = [
    { label: 'TRABAJO', valor: campos.trabajo },
    { label: 'TAMAÑO', valor: campos.tamano },
    { label: 'TINTA INTERNA', valor: campos.tintaInterna },
    { label: 'TINTA CARÁTULA', valor: campos.tintaCaratula },
    { label: 'PAPEL CARÁT.', valor: campos.papelCaratula },
    { label: 'PAPEL INT.', valor: campos.papelInterior },
    { label: 'ACABADO', valor: campos.acabado },
  ];

  // Campos extras
  const extras = campos.extras || [];
  const todosLosCampos = [
    ...camposBase.filter(c => c.valor),
    ...extras.map(e => ({ label: e.nombre?.toUpperCase() || e.label?.toUpperCase(), valor: e.valor }))
  ];

  todosLosCampos.forEach(campo => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${campo.label}:`, margenIzq, y);
    doc.setFont('helvetica', 'normal');
    doc.text(campo.valor, margenIzq + 45, y);
    y += 7;
  });

  // Cantidad
  if (orden.cantidad && orden.cantidad > 1) {
    doc.setFont('helvetica', 'bold');
    doc.text('CANTIDAD:', margenIzq, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(orden.cantidad), margenIzq + 45, y);
    y += 7;
  }

  // Valores
  const valorUnit = orden.cantidad > 1 ? orden.precio_sugerido / orden.cantidad : null;
  doc.setFont('helvetica', 'bold');

  if (valorUnit) {
    doc.text('VALOR UNIT.:', margenIzq, y);
    doc.setFont('helvetica', 'normal');
    doc.text(formatPesos(valorUnit), margenIzq + 45, y);
    y += 7;
    doc.setFont('helvetica', 'bold');
  }

  doc.text('VALOR TOTAL:', margenIzq, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatPesos(orden.precio_sugerido), margenIzq + 45, y);
  y += 10;

  // Línea separadora
  doc.line(margenIzq, y, margenDer, y);
  y += 8;

  // Notas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('LOS DISEÑOS ANTERIORES SERAN SUMINISTRADOS POR EL CLIENTE', margenIzq, y);
  y += 8;

  const formaPago = campos.formaPago || '50% al contratar y 50% contra entrega.';
  doc.text(`FORMA DE PAGO: ${formaPago}`, margenIzq, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  const notaRst = '"Digital Center se encuentra inscrita en el Régimen Simple de Tributación (RST), por lo tanto, los valores aquí relacionados no causan IVA"';
  const lineasNota = doc.splitTextToSize(notaRst, ancho);
  doc.text(lineasNota, margenIzq, y);
  y += lineasNota.length * 5 + 15;

  // Firma
  doc.setFont('helvetica', 'bold');
  doc.text('Cordialmente,', margenIzq, y);
  y += 12;
  doc.text('EDWIN CORREA', margenIzq, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Gerente', margenIzq, y);

  // Pie de página
  doc.setFontSize(8);
  doc.setDrawColor(200, 200, 200);
  doc.line(margenIzq, 280, margenDer, 280);
  doc.text('dc.digitalcenter / TEL. 319 392 0654 / MEDELLIN- COLOMBIA / E-MAIL.: dc.digitalcenter7@gmail.com', margenIzq, 285);

  // Descargar
  doc.save(`Cotizacion_${orden.numero_orden}_${orden.cliente}.pdf`);
}

// =============================================
// BORRAR ORDEN
// =============================================
async function borrarOrden(ordenId) {
  const confirmado = confirm('¿Estás seguro de que quieres borrar esta cotización? Esta acción no se puede deshacer.');
  if (!confirmado) return;

  await db.from('cotizacion_items').delete().eq('orden_id', ordenId);
  await db.from('gasto_items').delete().eq('orden_id', ordenId);
  await db.from('ordenes').delete().eq('id', ordenId);

  alert('✅ Cotización borrada correctamente');
  mostrarPantalla('pantalla-inicio');
}

// =============================================
// ABONOS
// =============================================
let contadorGastosOtros = 0;

function agregarGastoOtro() {
  contadorGastosOtros++;
  const contenedor = document.getElementById('gastos-otros-lista');
  const fila = document.createElement('div');
  fila.className = 'componente-fila';
  fila.id = `gasto-otro-${contadorGastosOtros}`;
  fila.innerHTML = `
    <input type="text" placeholder="Concepto" 
      style="flex:1;padding:10px;border:2px solid #e2e8f0;border-radius:8px;font-size:15px;margin-right:8px" />
    <input type="number" placeholder="$0" min="0" 
      class="gasto-otro-valor"
      style="width:110px;padding:10px;border:2px solid #e2e8f0;border-radius:8px;font-size:15px;text-align:right"
      onchange="calcularTotalGasto()" />
    <button onclick="document.getElementById('gasto-otro-${contadorGastosOtros}').remove(); calcularTotalGasto();" 
      style="background:none;border:none;color:#e53e3e;font-size:20px;cursor:pointer;margin-left:8px">✕</button>
  `;
  contenedor.appendChild(fila);
}

function calcularTotalGasto() {
  let total = 0;
  COMPONENTES.forEach(comp => {
    const input = document.getElementById(`gasto-${comp}`);
    if (input) total += parseFloat(input.value) || 0;
  });
  document.querySelectorAll('.gasto-otro-valor').forEach(input => {
    total += parseFloat(input.value) || 0;
  });
  document.getElementById('gasto-total').textContent = formatPesos(total);
}

async function cargarAbonos(ordenId) {
  ordenActualId = ordenId;
  const { data: orden } = await db.from('ordenes').select('*').eq('id', ordenId).single();
  const { data: abonos } = await db.from('abonos').select('*').eq('orden_id', ordenId).order('created_at', { ascending: true });

  document.getElementById('abonos-orden-info').textContent = `${orden.numero_orden} - ${orden.cliente}`;

  const totalAbonado = (abonos || []).reduce((sum, a) => sum + a.valor, 0);
  const falta = (orden.precio_sugerido || 0) - totalAbonado;

  document.getElementById('resumen-cobro').innerHTML = `
    <div class="fila-resumen"><span>💰 Valor a cobrar</span><span>${formatPesos(orden.precio_sugerido)}</span></div>
    <div class="fila-resumen"><span>✅ Total abonado</span><span>${formatPesos(totalAbonado)}</span></div>
    <div class="fila-resumen total" style="color:${falta > 0 ? '#e53e3e' : '#276749'}">
      <span>${falta > 0 ? '⏳ Falta por cobrar' : '✅ Pagado completo'}</span>
      <span>${formatPesos(Math.abs(falta))}</span>
    </div>
  `;

  const lista = document.getElementById('lista-abonos-detalle');
  lista.innerHTML = '';
  if (!abonos || abonos.length === 0) {
    lista.innerHTML = '<p class="cargando">No hay abonos registrados</p>';
  } else {
    abonos.forEach(a => {
      lista.innerHTML += `
        <div class="tarjeta-orden">
          <div class="orden-cliente">${formatPesos(a.valor)}</div>
          <div class="orden-descripcion">${a.nota || 'Sin nota'}</div>
          <div class="orden-numero">${new Date(a.created_at).toLocaleDateString('es-CO')}</div>
        </div>
      `;
    });
  }
}

async function guardarAbono() {
  const valor = parseFloat(document.getElementById('valor-abono').value) || 0;
  if (valor <= 0) { alert('Por favor escribe el valor del abono'); return; }

  const nota = document.getElementById('nota-abono').value.trim();

  await db.from('abonos').insert([{ orden_id: ordenActualId, valor, nota }]);

  // Actualizar total abonado en la orden
  const { data: abonos } = await db.from('abonos').select('valor').eq('orden_id', ordenActualId);
  const totalAbonado = (abonos || []).reduce((sum, a) => sum + a.valor, 0);
  const { data: orden } = await db.from('ordenes').select('precio_sugerido').eq('id', ordenActualId).single();

  const nuevoEstado = totalAbonado >= orden.precio_sugerido ? 'cerrada' : 'en-proceso';
  await db.from('ordenes').update({ total_abonado: totalAbonado, estado: nuevoEstado, cobrado_real: totalAbonado }).eq('id', ordenActualId);

  document.getElementById('valor-abono').value = '';
  document.getElementById('nota-abono').value = '';

  alert('✅ Abono guardado');
  cargarAbonos(ordenActualId);
}

async function cargarResumenAbonos(ordenId) {
  const { data: orden } = await db.from('ordenes').select('*').eq('id', ordenId).single();
  const { data: abonos } = await db.from('abonos').select('valor').eq('orden_id', ordenId);

  const totalAbonado = (abonos || []).reduce((sum, a) => sum + a.valor, 0);
  const falta = (orden.precio_sugerido || 0) - totalAbonado;

  const contenedor = document.getElementById(`resumen-abonos-${ordenId}`);
  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="resumen-cotizacion" style="margin-top:8px">
      <div class="fila-resumen"><span>💰 A cobrar</span><span>${formatPesos(orden.precio_sugerido)}</span></div>
      <div class="fila-resumen"><span>✅ Abonado</span><span>${formatPesos(totalAbonado)}</span></div>
      <div class="fila-resumen total" style="color:${falta > 0 ? '#e53e3e' : '#276749'}">
        <span>${falta > 0 ? '⏳ Falta' : '✅ Pagado'}</span><span>${formatPesos(Math.abs(falta))}</span>
      </div>
    </div>
  `;
}

async function cargarResumenGastosParciales(ordenId) {
  const { data: cotItems } = await db.from('cotizacion_items').select('*').eq('orden_id', ordenId);
  const { data: gastos } = await db.from('gasto_items').select('*').eq('orden_id', ordenId);

  if (!cotItems || cotItems.length === 0) return;

  // Agrupar gastos por componente
  const gastadoPor = {};
  (gastos || []).forEach(g => {
    gastadoPor[g.componente] = (gastadoPor[g.componente] || 0) + g.valor;
  });

  const totalCotizado = cotItems.reduce((sum, i) => sum + i.valor, 0);
  const totalGastado = Object.values(gastadoPor).reduce((sum, v) => sum + v, 0);
  const falta = totalCotizado - totalGastado;

  // Insertar en el detalle
  const contenido = document.getElementById('detalle-contenido');
  if (!contenido) return;

  let filasHTML = '';
  cotItems.forEach(item => {
    const gastado = gastadoPor[item.componente] || 0;
    const diff = item.valor - gastado;
    filasHTML += `
      <div class="fila-resumen">
        <span>${item.componente}</span>
        <span style="color:${diff > 0 ? '#e53e3e' : '#276749'}">${gastado > 0 ? formatPesos(gastado) : '⏳ Pendiente'}</span>
      </div>
    `;
  });

  const divGastos = document.createElement('div');
  divGastos.innerHTML = `
    <h3>🛒 Estado de compras</h3>
    <div class="resumen-cotizacion">
      ${filasHTML}
      <div class="fila-resumen total"><span>Total comprado</span><span>${formatPesos(totalGastado)}</span></div>
      <div class="fila-resumen total" style="color:${falta > 0 ? '#e53e3e' : '#276749'}">
        <span>${falta > 0 ? 'Falta comprar' : '✅ Todo comprado'}</span>
        <span>${formatPesos(Math.abs(falta))}</span>
      </div>
    </div>
  `;
  contenido.appendChild(divGastos);
}

// Iniciar app
cargarOrdenes();