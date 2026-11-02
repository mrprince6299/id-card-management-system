/**
 * Template customization persistence utility.
 * Saves design settings, company details, and field toggles to localStorage.
 * NOTE: Employee photos are strictly NOT stored here (they reside in IndexedDB).
 */

export const TEMPLATE_STORAGE_KEY = 'novatech_id_card_template_v1'

export const DEFAULT_TEMPLATE_SETTINGS = {
  selectedTemplateId: 'corporate-blue', // 'corporate-blue' | 'executive-minimal' | 'modern-tech'
  companyName: 'NOVATECH SOLUTIONS',
  tagline: 'Technology | Innovation | Excellence',
  address: 'Dehradun, Uttarakhand, India',
  website: 'www.novatech.example',
  contactEmail: 'contact@novatech.example',
  emergencyPhonePlaceholder: '+XX-XXXXXXXXXX',
  logoUrl: '', // Optional user uploaded logo
  customAccentColor: '', // Optional custom accent override
  showBloodGroup: true,
  showJoiningDate: true,
  showDepartment: true,
  showDesignation: true,
  showBarcode: true,
  showQrCode: true,
  showEmergencyContact: true,
  showSignatures: true,
  cardSide: 'front', // 'front' | 'back'
}

const getStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
  if (typeof localStorage !== 'undefined') return localStorage
  return null
}

/**
 * Retrieve saved template settings from localStorage with default fallback.
 */
export const getSavedTemplateSettings = () => {
  const storage = getStorage()
  if (!storage) return DEFAULT_TEMPLATE_SETTINGS

  try {
    const raw = storage.getItem(TEMPLATE_STORAGE_KEY)
    if (!raw) return DEFAULT_TEMPLATE_SETTINGS
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_TEMPLATE_SETTINGS, ...parsed }
  } catch (err) {
    console.warn('Failed to load template settings from localStorage:', err)
    return DEFAULT_TEMPLATE_SETTINGS
  }
}

/**
 * Save template settings to localStorage.
 * Supports optional { throwOnError: true } for staged restoration failure handling.
 */
export const saveTemplateSettings = (settings, options = {}) => {
  const storage = getStorage()
  if (!storage) {
    if (options.throwOnError) {
      throw new Error('Local storage is unavailable.')
    }
    return
  }
  try {
    storage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(settings))
  } catch (err) {
    console.error('Failed to save template settings to localStorage:', err)
    if (options.throwOnError) {
      throw err
    }
  }
}

/**
 * Reset template settings to factory defaults.
 */
export const resetTemplateSettings = () => {
  const storage = getStorage()
  if (!storage) return DEFAULT_TEMPLATE_SETTINGS
  try {
    storage.removeItem(TEMPLATE_STORAGE_KEY)
    return DEFAULT_TEMPLATE_SETTINGS
  } catch (err) {
    console.error('Failed to reset template settings:', err)
    return DEFAULT_TEMPLATE_SETTINGS
  }
}

