"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Cookies from "js-cookie"
import { useNotification } from "./ui/notification"
import { Input } from "./ui/input"
import { Button } from "./ui/button"

interface LoginProps {
  onLogin: (user: { name: string; email: string }) => void
}

export default function Login({ onLogin }: LoginProps) {
  const { addNotification } = useNotification()
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)

  const verifyToken = async () => {
    if (Cookies.get("jwt_token")) {
      try {
        const response = await fetch(`http://localhost:5000/api/auth/verify-token`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${Cookies.get("jwt_token")}`,
          },
        })
        const data = await response.json()

        if (data.user) {
          addNotification({
            type: "success",
            title: "Welcome Back!",
            message: "You have been automatically logged in.",
          })
          onLogin({
            name: data.user.name || "User",
            email: data.user.email || "",
          })
        }
      } catch (error) {
        addNotification({
          type: "error",
          title: "Authentication Error",
          message: "Failed to verify your session.",
        })
        console.error("Error verifying token:", error)
      }
    }
  }

  useEffect(() => {
    verifyToken()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!isLogin && formData.password !== formData.confirmPassword) {
        throw new Error("Passwords don't match!")
      }

      const endpoint = isLogin ? "login" : "create-account"
      const response = await fetch(`http://localhost:5000/api/auth/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          ...(!isLogin && { name: formData.name }),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed")
      }

      Cookies.set("jwt_token", data.token, {
        expires: 7,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      })

      addNotification({
        type: "success",
        title: isLogin ? "Login Successful" : "Account Created",
        message: isLogin ? "Welcome back!" : "Your account has been created successfully",
      })

      onLogin({
        name: data.user?.name || formData.name || "User",
        email: formData.email,
      })
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "Authentication Error",
        message: error.message || "Something went wrong",
      })
    } finally {
      setLoading(false)
    }
  }

  const demoLogin = async () => {
    try {
      setLoading(true)
      const response = await fetch("http://localhost:5000/api/auth/demo-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Demo login failed")
      }

      addNotification({
        type: "success",
        title: "Demo Login Successful",
        message: "You are now logged in as a demo user",
      })

      onLogin({
        name: "Demo User",
        email: "demo@freelanceflow.com",
      })
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "Demo Login Error",
        message: error.message || "Failed to login as demo user",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-10">
        {/* Header Section */}
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30 mb-8 transform hover:scale-105 transition-transform duration-300">
            <span className="text-white text-3xl font-bold">💼</span>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            FreelanceFlow
          </h1>
          <p className="text-xl text-gray-600 font-medium mb-2">Smart Estimate & Payment Dashboard</p>
          <p className="text-sm text-gray-500">
            {isLogin ? "Welcome back! Sign in to your account" : "Join thousands of freelancers growing their business"}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-500/10 border border-gray-200/60 p-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              {!isLogin && (
                <Input
                  label="Full Name"
                  type="text"
                  required={!isLogin}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your full name"
                />
              )}

              <Input
                label="Email Address"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter your email address"
              />

              <Input
                label="Password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter your password"
              />

              {!isLogin && (
                <Input
                  label="Confirm Password"
                  type="password"
                  required={!isLogin}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm your password"
                />
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                loading={loading}
                className="w-full py-4 text-base transform hover:-translate-y-0.5"
                size="lg"
              >
                {isLogin ? "Sign In" : "Create Account"}
              </Button>
            </div>

            {/* Footer Links */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200/60">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
              >
                {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </button>
              <Button type="button" onClick={demoLogin} loading={loading} variant="outline" size="sm">
                Try Demo
              </Button>
            </div>
          </form>
        </div>

        {/* Trust Indicators */}
        <div className="text-center space-y-4">
          <p className="text-xs text-gray-500">Trusted by 10,000+ freelancers worldwide</p>
          <div className="flex justify-center items-center space-x-6 opacity-60">
            <div className="flex items-center space-x-1">
              <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
              <span className="text-xs text-gray-600">4.9/5</span>
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <span className="text-xs text-gray-600">🔒 Secure & Encrypted</span>
            <div className="w-px h-4 bg-gray-300"></div>
            <span className="text-xs text-gray-600">💼 Professional Grade</span>
          </div>
        </div>
      </div>
    </div>
  )
}
