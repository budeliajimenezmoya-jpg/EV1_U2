import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  crearPublicacion,
  iniciarSesion,
  obtenerPublicaciones,
  reaccionarPublicacion,
} from '../services/usuario'

const REACCIONES = [
  { tipo: 'like', emoji: '👍', nombre: 'Me gusta' },
  { tipo: 'love', emoji: '❤️', nombre: 'Me encanta' },
  { tipo: 'haha', emoji: '😂', nombre: 'Me divierte' },
  { tipo: 'wow', emoji: '😮', nombre: 'Me sorprende' },
  { tipo: 'sad', emoji: '😢', nombre: 'Me entristece' },
  { tipo: 'angry', emoji: '😡', nombre: 'Me enoja' },
]

const inputClass =
  'w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-900 transition-colors outline-none placeholder:text-neutral-400 focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/20'

const labelClass = 'mb-1.5 block text-sm font-medium text-neutral-700'

function fechaPublicacion(createdAt) {
  if (!createdAt) return 'Fecha desconocida'
  const fecha = new Date(createdAt)
  if (Number.isNaN(fecha.getTime())) return 'Fecha desconocida'
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(fecha)
}

function TarjetaPublicacion({ publicacion, alReaccionar, reaccionActiva, error }) {
  const conteos = publicacion.reactions ?? {}

  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">{publicacion.title}</h2>
        <time
          className="shrink-0 text-xs text-neutral-400"
          dateTime={publicacion.createdAt}
        >
          {fechaPublicacion(publicacion.createdAt)}
        </time>
      </header>
      <p className="mt-1 text-sm text-violet-700">
        Por {publicacion.author?.name || 'Autor desconocido'}
      </p>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
        {publicacion.content}
      </p>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
        {REACCIONES.map(({ tipo, emoji, nombre }) => (
          <button
            key={tipo}
            type="button"
            aria-label={`${nombre}: ${conteos[tipo] ?? 0}`}
            title={nombre}
            disabled={Boolean(reaccionActiva)}
            onClick={() => alReaccionar(publicacion.id, tipo)}
            className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm transition-colors hover:border-violet-300 hover:bg-violet-50 disabled:cursor-wait disabled:opacity-60"
          >
            {emoji} <span className="text-neutral-600">{conteos[tipo] ?? 0}</span>
          </button>
        ))}
      </div>
      {error && (
        <p aria-live="polite" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </article>
  )
}

function Publicaciones() {
  const [publicaciones, setPublicaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [errorFormulario, setErrorFormulario] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorSesion, setErrorSesion] = useState('')
  const [iniciandoSesion, setIniciandoSesion] = useState(false)
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [usuario, setUsuario] = useState(() =>
    JSON.parse(localStorage.getItem('user') || 'null'),
  )
  const [reaccionActiva, setReaccionActiva] = useState('')
  const [erroresReaccion, setErroresReaccion] = useState({})

  useEffect(() => {
    let activo = true
    obtenerPublicaciones()
      .then((items) => {
        if (activo) setPublicaciones(items)
      })
      .catch((error) => {
        if (activo) setErrorCarga(error.message)
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setErrorSesion('')
    setIniciandoSesion(true)

    try {
      const resultado = await iniciarSesion({ email, password })
      if (!resultado.user || !resultado.token) {
        throw new Error('La respuesta de inicio de sesión no tiene el formato esperado.')
      }
      localStorage.setItem('token', resultado.token)
      localStorage.setItem('user', JSON.stringify(resultado.user))
      setToken(resultado.token)
      setUsuario(resultado.user)
      setPassword('')
    } catch (error) {
      setErrorSesion(error.message)
    } finally {
      setIniciandoSesion(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken('')
    setUsuario(null)
  }

  const handleCrearPublicacion = async (e) => {
    e.preventDefault()
    setErrorFormulario('')
    setGuardando(true)

    try {
      const publicacion = await crearPublicacion(
        { title: titulo.trim(), content: contenido.trim() },
        token,
      )
      setPublicaciones((actuales) => [publicacion, ...actuales])
      setTitulo('')
      setContenido('')
    } catch (error) {
      setErrorFormulario(error.message)
    } finally {
      setGuardando(false)
    }
  }

  const handleReaccionar = async (publicacionId, tipo) => {
    const clave = `${publicacionId}:${tipo}`
    setReaccionActiva(clave)
    setErroresReaccion((actuales) => ({ ...actuales, [publicacionId]: '' }))

    try {
      const resultado = await reaccionarPublicacion(
        publicacionId,
        tipo,
        usuario?.id,
      )
      if (!resultado.counts) {
        throw new Error('La respuesta de reacción no tiene el formato esperado.')
      }
      setPublicaciones((actuales) =>
        actuales.map((publicacion) =>
          publicacion.id === publicacionId
            ? { ...publicacion, reactions: resultado.counts }
            : publicacion,
        ),
      )
    } catch (error) {
      setErroresReaccion((actuales) => ({
        ...actuales,
        [publicacionId]: error.message,
      }))
    } finally {
      setReaccionActiva('')
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Publicaciones
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Comparte preguntas e ideas con tu clase.
        </p>
      </header>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        {token ? (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-neutral-600">
                Sesión iniciada{usuario?.name ? ` como ${usuario.name}` : ''}.
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-medium text-violet-700 hover:text-violet-900"
              >
                Cerrar sesión
              </button>
            </div>
            <form onSubmit={handleCrearPublicacion} className="space-y-4">
              <div>
                <label htmlFor="titulo-publicacion" className={labelClass}>
                  Título
                </label>
                <input
                  id="titulo-publicacion"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className={inputClass}
                  maxLength={120}
                  required
                />
              </div>
              <div>
                <label htmlFor="contenido-publicacion" className={labelClass}>
                  Contenido
                </label>
                <textarea
                  id="contenido-publicacion"
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                  className={`${inputClass} min-h-28 resize-y`}
                  rows={4}
                  maxLength={5000}
                  required
                />
              </div>
              {errorFormulario && (
                <p aria-live="polite" className="text-sm text-red-600">
                  {errorFormulario}
                </p>
              )}
              <button
                type="submit"
                disabled={guardando}
                className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
              >
                {guardando ? 'Publicando…' : 'Publicar'}
              </button>
            </form>
          </>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Iniciar sesión para publicar
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  También puedes reaccionar sin iniciar sesión.
                </p>
              </div>
              <div>
                <label htmlFor="email-sesion" className={labelClass}>
                  Correo electrónico
                </label>
                <input
                  id="email-sesion"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label htmlFor="password-sesion" className={labelClass}>
                  Contraseña
                </label>
                <input
                  id="password-sesion"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              {errorSesion && (
                <p aria-live="polite" className="text-sm text-red-600">
                  {errorSesion}
                </p>
              )}
              <button
                type="submit"
                disabled={iniciandoSesion}
                className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60"
              >
                {iniciandoSesion ? 'Ingresando…' : 'Iniciar sesión'}
              </button>
            </form>
            <div className="flex flex-col items-start justify-center rounded-xl bg-violet-50 p-5">
              <h2 className="font-semibold text-neutral-900">¿Aún no tienes cuenta?</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Regístrate para compartir tus propias publicaciones.
              </p>
              <Link
                to="/registrarme"
                className="mt-4 rounded-full border border-violet-200 bg-white px-5 py-2.5 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-100"
              >
                Crear una cuenta
              </Link>
            </div>
          </div>
        )}
      </section>

      <section aria-label="Listado de publicaciones" className="space-y-4">
        {cargando && (
          <p role="status" className="py-8 text-center text-sm text-neutral-500">
            Cargando publicaciones…
          </p>
        )}

        {errorCarga && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-medium text-red-700">
              No se pudieron cargar las publicaciones
            </p>
            <p className="mt-1 text-sm text-red-600">{errorCarga}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        )}

        {!cargando && !errorCarga && publicaciones.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
            <p className="font-medium text-neutral-700">
              Todavía no hay publicaciones.
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              ¡Comparte la primera idea con tu clase!
            </p>
          </div>
        )}

        {publicaciones.map((publicacion) => (
          <TarjetaPublicacion
            key={publicacion.id}
            publicacion={publicacion}
            alReaccionar={handleReaccionar}
            reaccionActiva={reaccionActiva}
            error={erroresReaccion[publicacion.id]}
          />
        ))}
      </section>
    </div>
  )
}

export default Publicaciones
