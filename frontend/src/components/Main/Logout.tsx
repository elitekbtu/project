import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const Logout = () => {
  const { logout } = useAuth()
  useEffect(() => {
    logout()
  }, [])

  return <Navigate to="/" replace />
}

export default Logout 