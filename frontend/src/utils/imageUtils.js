const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value)

const sanitize = (value) => (typeof value === 'string' ? value.trim() : '')

export const normalizeImageUrl = (rawUrl) => {
  const value = sanitize(rawUrl)
  if (!value) return null

  if (isAbsoluteUrl(value)) {
    return value
  }

  if (value.startsWith('/')) {
    return `${API_BASE_URL}${value}`
  }

  return `${API_BASE_URL}/${value}`
}

export const getPublicImageFallback = (rawUrl) => {
  const value = sanitize(rawUrl)
  if (!value) return null

  try {
    const parsed = isAbsoluteUrl(value) ? new URL(value) : new URL(value, API_BASE_URL)
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
