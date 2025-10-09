export async function showForm(values = {}) {
  const { value: formValues } = await Swal.fire({
    title: values.id ? 'Editar línea' : 'Nueva línea',
    html: `
      <label>Nombre:</label>
      <input id="nombre" class="swal2-input" value="${values.nombre || ''}">
      <label>Barrio:</label>
      <input id="barrio" class="swal2-input" value="${values.barrio || ''}">
    `,
    focusConfirm: false,
    preConfirm: () => ({
      nombre: document.getElementById('nombre').value,
      barrio: document.getElementById('barrio').value
    })
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
