import { SIDWAL_LOGO_SRC } from '../assets/sidwalLogo.js'
import { TEMPLATE_STORAGE_KEY, DEFAULT_TEMPLATE_SETTINGS } from './templateStorage.js'

export const ORGANIZATIONS_STORAGE_KEY = 'idcard_organizations_v2'
export const ACTIVE_ORG_STORAGE_KEY = 'idcard_active_org_id_v2'

export const DEFAULT_ORGANIZATIONS = [
  {
    id: 'novatech',
    name: 'Novatech Solutions',
    companyName: 'NOVATECH SOLUTIONS',
    tagline: 'Technology | Innovation | Excellence',
    address: 'Dehradun, Uttarakhand, India',
    website: 'www.novatech.example',
    contactEmail: 'contact@novatech.example',
    emergencyPhonePlaceholder: '+XX-XXXXXXXXXX',
    logoUrl: '',
    customAccentColor: '',
    defaultTemplateId: 'corporate-blue',
    cardType: 'employee',
    isImmutableBranding: false,
    customOverlay: {
      enabled: false,
      backgroundImageUrl: '',
      fieldCoordinates: [],
    },
  },
  {
    id: 'sidwal-railway',
    name: 'North Eastern Railway (SIDWAL)',
    companyName: 'SIDWAL REFRIGERATION INDUSTRIES (P) LTD',
    workshopHeading: 'MECHANICAL WORKSHOP GORAKHPUR',
    railwayHeading: 'NORTH EASTERN RAILWAY',
    tagline: 'Mechanical Workshop Gorakhpur • North Eastern Railway',
    address: 'Mechanical Workshop, Gorakhpur, UP, India',
    website: 'www.sidwal.com',
    contactEmail: 'railways@sidwal.com',
    emergencyPhonePlaceholder: '+91-XXXXXXXXXX',
    logoUrl: 'asset:sidwal-logo',
    customAccentColor: '#e30613',
    defaultTemplateId: 'sidwal-workshop',
    cardType: 'contractor',
    isImmutableBranding: true, // SIDWAL branding is strictly immutable
    customOverlay: {
      enabled: false,
      backgroundImageUrl: '',
      fieldCoordinates: [],
    },
  },
  {
    id: 'apex-university',
    name: 'Apex Institute of Technology',
    companyName: 'APEX INSTITUTE OF TECHNOLOGY',
    tagline: 'Excellence in Engineering & Applied Sciences',
    address: 'Knowledge Park III, Greater Noida, UP, India',
    website: 'www.apex-institute.edu',
    contactEmail: 'admin@apex-institute.edu',
    emergencyPhonePlaceholder: '+91 120-XXXXXXX',
    logoUrl: '',
    customAccentColor: '#1e3a8a',
    defaultTemplateId: 'corporate-blue',
    cardType: 'student',
    isImmutableBranding: false,
    customOverlay: {
      enabled: false,
      backgroundImageUrl: '',
      fieldCoordinates: [],
    },
  },
  {
    id: 'tech-summit',
    name: 'Global Tech Summit 2026',
    companyName: 'GLOBAL TECH SUMMIT 2026',
    tagline: 'Annual AI & Cloud Computing Conference',
    address: 'Convention Center, Hall 4, Bangalore, India',
    website: 'www.globaltechsummit.org',
    contactEmail: 'support@globaltechsummit.org',
    emergencyPhonePlaceholder: '+91-80-XXXXXXX',
    logoUrl: '',
    customAccentColor: '#06b6d4',
    defaultTemplateId: 'modern-tech',
    cardType: 'event',
    isImmutableBranding: false,
    customOverlay: {
      enabled: false,
      backgroundImageUrl: '',
      fieldCoordinates: [],
    },
  },
  {
    id: 'custom-org',
    name: 'Custom Organization / Institution',
    companyName: 'YOUR ORGANIZATION NAME',
    tagline: 'Identity & Credential Portal',
    address: 'City, Country',
    website: 'www.example.com',
    contactEmail: 'info@example.com',
    emergencyPhonePlaceholder: '+XX-XXXXXXXXXX',
    logoUrl: '',
    customAccentColor: '',
    defaultTemplateId: 'executive-minimal',
    cardType: 'custom',
    isImmutableBranding: false,
    customOverlay: {
      enabled: false,
      backgroundImageUrl: '',
      fieldCoordinates: [],
    },
  },
]

export const UNASSIGNED_LEGACY_ORG = {
  id: 'unassigned-legacy',
  name: 'Unassigned Legacy Records',
  companyName: 'UNASSIGNED LEGACY COHORT',
  tagline: 'Legacy records pending organization assignment',
  address: 'System Recovery Store',
  website: '',
  contactEmail: '',
  emergencyPhonePlaceholder: '',
  logoUrl: '',
  customAccentColor: '#64748b',
  defaultTemplateId: 'executive-minimal',
  cardType: 'custom',
  isImmutableBranding: true,
  isSystemOrg: true,
  customOverlay: {
    enabled: false,
    backgroundImageUrl: '',
    fieldCoordinates: [],
  },
}

/**
 * Hydrates asset references with genuine in-memory base64 URLs without storing them in localStorage.
 */
export const hydrateOrgAssets = (org) => {
  if (!org) return org
  if (org.id === 'sidwal-railway' || org.logoUrl === 'asset:sidwal-logo') {
    return { ...org, logoUrl: SIDWAL_LOGO_SRC }
  }
  return org
}

/**
 * Strips heavy binary data URLs before persisting to localStorage to protect storage quotas & privacy.
 */
const sanitizeForStorage = (org) => {
  if (!org) return org
  if (org.id === 'sidwal-railway' || org.logoUrl === SIDWAL_LOGO_SRC) {
    return { ...org, logoUrl: 'asset:sidwal-logo' }
  }
  return org
}

const getStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
  if (typeof localStorage !== 'undefined') return localStorage
  return null
}

/**
 * Retrieve saved organizations from localStorage with fallback and hydration.
 */
export const getStoredOrganizations = () => {
  const storage = getStorage()
  if (!storage) return DEFAULT_ORGANIZATIONS.map(hydrateOrgAssets)

  try {
    const raw = storage.getItem(ORGANIZATIONS_STORAGE_KEY)
    if (!raw) {
      // Check if legacy template settings exist to migrate Novatech settings
      const legacyRaw = storage.getItem(TEMPLATE_STORAGE_KEY)
      if (legacyRaw) {
        try {
          const legacy = JSON.parse(legacyRaw)
          const migrated = DEFAULT_ORGANIZATIONS.map((org) => {
            if (org.id === 'novatech') {
              return { ...org, ...legacy }
            }
            return org
          })
          storage.setItem(
            ORGANIZATIONS_STORAGE_KEY,
            JSON.stringify(migrated.map(sanitizeForStorage))
          )
          return migrated.map(hydrateOrgAssets)
        } catch (_) {}
      }
      storage.setItem(
        ORGANIZATIONS_STORAGE_KEY,
        JSON.stringify(DEFAULT_ORGANIZATIONS.map(sanitizeForStorage))
      )
      return DEFAULT_ORGANIZATIONS.map(hydrateOrgAssets)
    }
    const parsed = JSON.parse(raw)
    let list = Array.isArray(parsed) ? parsed : DEFAULT_ORGANIZATIONS

    // If unassigned legacy records exist, include the recovery organization in the active list
    try {
      const recordsRaw = storage.getItem('employee_records_v1')
      if (recordsRaw && recordsRaw.includes('"unassigned-legacy"')) {
        if (!list.some((o) => o.id === 'unassigned-legacy')) {
          list = [...list, UNASSIGNED_LEGACY_ORG]
        }
      }
    } catch (_) {}

    return list.map(hydrateOrgAssets)
  } catch (err) {
    console.warn('Failed to load organizations from localStorage:', err)
    return DEFAULT_ORGANIZATIONS.map(hydrateOrgAssets)
  }
}

/**
 * Persist organizations to localStorage (sanitizing heavy assets).
 * Supports optional { throwOnError: true } for staged restoration failure handling.
 */
export const saveStoredOrganizations = (orgs, options = {}) => {
  const storage = getStorage()
  if (!storage) {
    if (options.throwOnError) {
      throw new Error('Local storage is unavailable.')
    }
    return
  }
  try {
    const sanitized = orgs.map(sanitizeForStorage)
    storage.setItem(ORGANIZATIONS_STORAGE_KEY, JSON.stringify(sanitized))
  } catch (err) {
    console.error('Failed to save organizations to localStorage:', err)
    if (options.throwOnError) {
      throw err
    }
  }
}

/**
 * Get the currently active organization ID.
 */
export const getActiveOrganizationId = () => {
  const storage = getStorage()
  if (!storage) return DEFAULT_ORGANIZATIONS[0].id
  try {
    const val = storage.getItem(ACTIVE_ORG_STORAGE_KEY)
    if (val === 'null' || val === '' || val === '__NO_ACTIVE_ORG__') return null
    return val || DEFAULT_ORGANIZATIONS[0].id
  } catch (_) {
    return DEFAULT_ORGANIZATIONS[0].id
  }
}

/**
 * Set the currently active organization ID.
 */
export const setActiveOrganizationId = (orgId) => {
  const storage = getStorage()
  if (!storage) return
  try {
    if (orgId === null) {
      storage.setItem(ACTIVE_ORG_STORAGE_KEY, '__NO_ACTIVE_ORG__')
    } else if (orgId === undefined || orgId === '') {
      storage.removeItem(ACTIVE_ORG_STORAGE_KEY)
    } else {
      storage.setItem(ACTIVE_ORG_STORAGE_KEY, orgId)
    }
  } catch (err) {
    console.error('Failed to save active organization ID:', err)
  }
}

/**
 * Get active organization profile object.
 */
export const getActiveOrganization = () => {
  const orgs = getStoredOrganizations()
  const activeId = getActiveOrganizationId()
  return orgs.find((o) => o.id === activeId) || orgs[0]
}

/**
 * Update an organization profile by ID.
 * Protects immutable organizations like SIDWAL from branding changes.
 */
export const updateOrganization = (orgId, updates) => {
  const orgs = getStoredOrganizations()
  const target = orgs.find((o) => o.id === orgId)

  if (!target) return orgs

  // If branding is immutable (like SIDWAL), ignore changes to companyName, logoUrl, or typography colors
  const sanitizedUpdates = { ...updates }
  if (target.isImmutableBranding) {
    delete sanitizedUpdates.companyName
    delete sanitizedUpdates.logoUrl
    delete sanitizedUpdates.workshopHeading
    delete sanitizedUpdates.railwayHeading
  }

  const updatedOrgs = orgs.map((o) => {
    if (o.id === orgId) {
      return { ...o, ...sanitizedUpdates, updatedAt: new Date().toISOString() }
    }
    return o
  })

  saveStoredOrganizations(updatedOrgs)
  return updatedOrgs
}

/**
 * Update the active organization profile.
 * Protects immutable organizations like SIDWAL from branding changes.
 */
export const updateActiveOrganization = (updates) => {
  const activeId = getActiveOrganizationId()
  return updateOrganization(activeId, updates)
}

/**
 * Archive an organization.
 * Protects against archiving the last active organization or protected system organizations.
 */
export const archiveOrganization = (orgId) => {
  const orgs = getStoredOrganizations()
  const target = orgs.find((o) => o.id === orgId)

  if (!target) return orgs
  if (target.isArchived) return orgs

  if (target.isImmutableBranding || target.isSystemOrg) {
    throw new Error('Protected system organizations cannot be archived.')
  }

  const activeNonArchived = orgs.filter((o) => !o.isArchived && o.id !== 'unassigned-legacy')
  if (activeNonArchived.length <= 1) {
    throw new Error('Cannot archive the only remaining active organization.')
  }

  const updatedOrgs = orgs.map((o) => {
    if (o.id === orgId) {
      return { ...o, isArchived: true, archivedAt: new Date().toISOString() }
    }
    return o
  })

  saveStoredOrganizations(updatedOrgs)

  // If the active org was archived, automatically switch to another active org
  if (getActiveOrganizationId() === orgId) {
    const nextActive = updatedOrgs.find((o) => !o.isArchived && o.id !== 'unassigned-legacy')
    if (nextActive) {
      setActiveOrganizationId(nextActive.id)
    }
  }

  return updatedOrgs
}

/**
 * Restore an archived organization back to active status.
 */
export const restoreOrganization = (orgId) => {
  const orgs = getStoredOrganizations()
  const target = orgs.find((o) => o.id === orgId)

  if (!target || !target.isArchived) return orgs

  const updatedOrgs = orgs.map((o) => {
    if (o.id === orgId) {
      return { ...o, isArchived: false, archivedAt: null }
    }
    return o
  })

  saveStoredOrganizations(updatedOrgs)
  return updatedOrgs
}

/**
 * Permanently delete an organization profile with safety constraints.
 * Throws an error if attempting to delete protected system orgs or the last remaining active org.
 */
export const deleteOrganization = (orgId) => {
  const orgs = getStoredOrganizations()
  const target = orgs.find((o) => o.id === orgId)

  if (!target) return { updatedOrgs: orgs, switchedOrgId: null }

  if (target.isImmutableBranding || target.isSystemOrg) {
    throw new Error('Protected system organizations cannot be permanently deleted.')
  }

  const remainingActive = orgs.filter((o) => o.id !== orgId && !o.isArchived && o.id !== 'unassigned-legacy')
  if (remainingActive.length === 0) {
    throw new Error('Cannot delete the only remaining active organization.')
  }

  const updatedOrgs = orgs.filter((o) => o.id !== orgId)
  saveStoredOrganizations(updatedOrgs)

  let switchedOrgId = null
  if (getActiveOrganizationId() === orgId) {
    switchedOrgId = remainingActive[0].id
    setActiveOrganizationId(switchedOrgId)
  }

  return { updatedOrgs, switchedOrgId }
}

/**
 * Add a new custom organization profile.
 */
export const addNewOrganization = (newOrg) => {
  const orgs = getStoredOrganizations()
  const id = newOrg.id || `org_${Date.now()}`
  const created = {
    ...DEFAULT_ORGANIZATIONS[4], // custom-org template
    ...newOrg,
    id,
    isImmutableBranding: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
  }
  const updatedOrgs = [...orgs, created]
  saveStoredOrganizations(updatedOrgs)
  setActiveOrganizationId(id)
  return updatedOrgs
}

/**
 * Reset organizations back to factory defaults.
 */
export const resetOrganizationsToDefault = () => {
  const storage = getStorage()
  if (!storage) return DEFAULT_ORGANIZATIONS.map(hydrateOrgAssets)
  try {
    storage.setItem(
      ORGANIZATIONS_STORAGE_KEY,
      JSON.stringify(DEFAULT_ORGANIZATIONS.map(sanitizeForStorage))
    )
    setActiveOrganizationId(DEFAULT_ORGANIZATIONS[0].id)
    return DEFAULT_ORGANIZATIONS.map(hydrateOrgAssets)
  } catch (_) {
    return DEFAULT_ORGANIZATIONS.map(hydrateOrgAssets)
  }
}
