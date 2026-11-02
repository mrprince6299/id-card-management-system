import { useEmployees } from '../context/EmployeeContext'

/**
 * Custom hook to access employee records and real-time statistics.
 */
export const useEmployeeData = () => {
  return useEmployees()
}

