const API_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, '')

async function solicitar(endpoint, { method = 'GET', body, token } = {}) {
  if (!API_URL) {
    throw new Error('Falta configurar VITE_API_URL en el archivo .env.')
  }

  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  const respuesta = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })
  const texto = await respuesta.text()
  let datos = {}

  if (texto) {
    try {
      datos = JSON.parse(texto)
    } catch {
      throw new Error('El servidor devolvió una respuesta inválida.')
    }
  }

  if (!respuesta.ok) {
    throw new Error(datos.error || `Error HTTP ${respuesta.status}`)
  }

  return datos
}

export async function obtenerUsuarios() {
  const datos = await solicitar('/users')
  if (!Array.isArray(datos.users)) {
    throw new Error('La respuesta de usuarios no tiene el formato esperado.')
  }
  return datos.users
}

export function registrarUsuario(usuario) {
  return solicitar('/auth/register', { method: 'POST', body: usuario })
}

export function iniciarSesion(credenciales) {
  return solicitar('/auth/login', { method: 'POST', body: credenciales })
}

export async function obtenerPublicaciones() {
  const datos = await solicitar('/posts')
  if (!Array.isArray(datos.posts)) {
    throw new Error('La respuesta de publicaciones no tiene el formato esperado.')
  }
  return datos.posts
}

export async function crearPublicacion(publicacion, token) {
  if (!token) throw new Error('Inicia sesión para crear una publicación.')

  const datos = await solicitar('/posts', {
    method: 'POST',
    body: publicacion,
    token,
  })
  if (!datos.post) {
    throw new Error('La respuesta al crear la publicación no tiene el formato esperado.')
  }
  return datos.post
}

export function reaccionarPublicacion(publicacionId, tipo, userId) {
  return solicitar(`/posts/${encodeURIComponent(publicacionId)}/reactions`, {
    method: 'POST',
    body: { type: tipo, ...(userId && { userId }) },
  })
}
