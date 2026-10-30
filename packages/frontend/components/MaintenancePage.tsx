import React from 'react'
import { Wrench, Clock, Mail, ArrowRight } from 'lucide-react'

interface MaintenancePageProps {
  estimatedTime?: string
  message?: string
}

const MaintenancePage: React.FC<MaintenancePageProps> = ({ 
  estimatedTime = "a few hours", 
  message = "We're currently performing scheduled maintenance to improve your experience." 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Animated maintenance icon */}
        <div className="mb-8 relative">
          <div className="w-32 h-32 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-blue-500/30">
            <Wrench className="w-16 h-16 text-blue-400 animate-pulse" />
          </div>
          <div className="absolute inset-0 w-32 h-32 mx-auto rounded-full border-2 border-blue-500/30 animate-spin border-t-blue-400"></div>
        </div>

        {/* Main content */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Under Maintenance
          </h1>
          
          <p className="text-xl text-blue-100 mb-6 leading-relaxed">
            {message}
          </p>

          <div className="flex items-center justify-center gap-2 text-blue-200 mb-8">
            <Clock className="w-5 h-5" />
            <span>Estimated time: {estimatedTime}</span>
          </div>

          {/* Status updates */}
          <div className="bg-white/5 rounded-xl p-6 mb-8 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">What we&apos;re working on:</h3>
            <ul className="text-left space-y-2 text-blue-100">
              <li className="flex items-center gap-3">
                <ArrowRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>Improving site performance</span>
              </li>
              <li className="flex items-center gap-3">
                <ArrowRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>Adding new features</span>
              </li>
              <li className="flex items-center gap-3">
                <ArrowRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>Security updates</span>
              </li>
            </ul>
          </div>

          {/* Contact info */}
          <div className="text-center">
            <p className="text-blue-200 mb-4">
              Need immediate assistance?
            </p>
            <a 
              href="mailto:demi.21@outlook.com" 
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 font-medium"
            >
              <Mail className="w-4 h-4" />
              Contact Me
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-blue-300 text-sm">
          <p>Thank you for your patience!</p>
          <p className="mt-2">- Demi Taylor Nimmo</p>
        </div>
      </div>
    </div>
  )
}

export default MaintenancePage
