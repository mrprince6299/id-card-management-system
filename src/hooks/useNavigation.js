import { useState } from 'react'

export const useNavigation = (initialTab = 'overview') => {
  const [currentTab, setCurrentTab] = useState(initialTab)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev)
  const closeSidebar = () => setIsSidebarOpen(false)

  const navigateTo = (tabId) => {
    setCurrentTab(tabId)
    closeSidebar()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return {
    currentTab,
    setCurrentTab: navigateTo,
    isSidebarOpen,
    toggleSidebar,
    closeSidebar,
  }
}

