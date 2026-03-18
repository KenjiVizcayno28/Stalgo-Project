const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '')

const getBrowserOrigin = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value)

const isLocalHostName = (hostname) => hostname === 'localhost' || hostname === '127.0.0.1'

const sanitize = (value) => (typeof value === 'string' ? value.trim() : '')

export const normalizeImageUrl = (rawUrl) => {
  const value = sanitize(rawUrl)
  if (!value) return null

  if (isAbsoluteUrl(value)) {
    try {
      const parsed = new URL(value)
      if (isLocalHostName(parsed.hostname)) {
        const pathWithQuery = `${parsed.pathname}${parsed.search || ''}`
        return API_BASE_URL ? `${API_BASE_URL}${pathWithQuery}` : pathWithQuery
      }
    } catch {
      return value
    }
    return value
  }

  if (value.startsWith('/')) {
    return API_BASE_URL ? `${API_BASE_URL}${value}` : value
  }

  return API_BASE_URL ? `${API_BASE_URL}/${value}` : `/${value}`
}

export const getPublicImageFallback = (rawUrl) => {
  const value = sanitize(rawUrl)
  if (!value) return null

  try {
    const parsed = isAbsoluteUrl(value) ? new URL(value) : new URL(value, API_BASE_URL || getBrowserOrigin())
    const fileName = parsed.pathname.split('/').pop()
    if (!fileName) return null
    return `/images/${fileName}`
  } catch {
    const fileName = value.split('/').pop()
    return fileName ? `/images/${fileName}` : null
  }
}

export const resolveProductImage = (product) => {
  return normalizeImageUrl(product?.image || product?.image_url)
}

export const resolveUnitDesignImage = (product) => {
  return normalizeImageUrl(
    product?.unitDesign?.image || product?.unit_design_image || product?.unit_design_image_url
  )
}
