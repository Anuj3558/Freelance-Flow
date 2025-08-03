"use client"

import React, { createContext, useContext, ReactNode, useState } from 'react'

interface User {
  name: string
  email: string
  jwt_token: string | null
  avatar: string | null
  role: string
}

interface UserContextType {
  user: User | null
  setUser: (user: User | null) => void
  isAuthenticated: boolean
  isLoading: boolean
  login: (userData: Partial<User>) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const login = (userData: Partial<User>) => {
    setIsLoading(true)
    try {
      // Default values for the user
      const newUser: User = {
        name: userData.name || 'Anonymous',
        email: userData.email || '',
        jwt_token: userData.jwt_token || null,
        avatar: userData.avatar || null,
        role: userData.role || 'user',
      }
      setUser(newUser)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
  }

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates })
    }
  }

  const value = {
    user,
    setUser,
    isAuthenticated: !!user?.jwt_token,
    isLoading,
    login,
    logout,
    updateUser,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}