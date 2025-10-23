export async function showForm(values = {}, tipo = 'línea') {
  const esEdicion = !!values.id;
  const titulo = esEdicion
    ? `Editar ${tipo}`
    : `Registrar ${tipo}`;

  // 🔹 Base de campos: nombre (siempre)
  let camposHTML = `
    <label>Nombre:</label>
    <input id="nombre" class="swal2-input" value="${values.nombre || ''}">
  `;

  // 🔹 Solo agregar "barrio" para tipos que lo requieran
  if (tipo !== 'equipamiento') {
    camposHTML += `
      <label>Barrio:</label>
      <input id="barrio" class="swal2-input" value="${values.barrio || ''}">
    `;
  }

  // 🔹 Si es equipamiento, agregar selector de tipo
  if (tipo === 'equipamiento') {
    camposHTML += `
      <label>Tipo de equipamiento:</label>
      <select id="tipo" class="swal2-select">
        <option value="">Seleccione tipo</option>
        <option value="Educación" ${values.tipo === 'Educación' ? 'selected' : ''}>Educación</option>
        <option value="Salud" ${values.tipo === 'Salud' ? 'selected' : ''}>Salud</option>
        <option value="Cultura" ${values.tipo === 'Cultura' ? 'selected' : ''}>Cultura</option>
        <option value="Deporte" ${values.tipo === 'Deporte' ? 'selected' : ''}>Deporte</option>
        <option value="Seguridad" ${values.tipo === 'Seguridad' ? 'selected' : ''}>Seguridad</option>
        <option value="Administración" ${values.tipo === 'Administración' ? 'selected' : ''}>Administración</option>
        <option value="Otro" ${values.tipo === 'Otro' ? 'selected' : ''}>Otro</option>
      </select>
    `;
  }

  const { value: formValues } = await Swal.fire({
    title: titulo,
    html: camposHTML,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: esEdicion ? 'Guardar cambios' : 'Registrar',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      const nombre = document.getElementById('nombre').value.trim();
      const barrioInput = document.getElementById('barrio');
      const barrio = barrioInput ? barrioInput.value.trim() : null;
      const tipoEquip = tipo === 'equipamiento'
        ? document.getElementById('tipo').value.trim()
        : null;

      if (!nombre) {
        Swal.showValidationMessage('⚠️ El nombre es obligatorio');
        return false;
      }

      if (tipo === 'equipamiento' && !tipoEquip) {
        Swal.showValidationMessage('⚠️ Debes seleccionar un tipo de equipamiento');
        return false;
      }

      return { nombre, barrio, tipo: tipoEquip };
    }
  });

  return formValues;
}

export async function showConfirm(text) {
  const result = await Swal.fire({
    title: 'Confirmar',
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí',
    cancelButtonText: 'No'
  });
  return result.isConfirmed;
}
