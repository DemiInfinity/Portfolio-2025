'use client'

import { Github, Linkedin, Mail, Heart } from 'lucide-react'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer-girly">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold gradient-text" style={{ fontFamily: 'Dancing Script, cursive' }}>
              ✨ Demi Taylor Nimmo
            </h3>
            <p className="text-gray-700 text-sm font-medium">
              Full Stack Software Engineer passionate about creating beautiful, innovative solutions
              and building exceptional user experiences. 💖
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
              💫 Quick Links
            </h3>
            <div className="space-y-2">
              <a href="/projects" className="block text-gray-600 hover:text-pink-600 text-sm transition-colors font-medium">
                Projects ✨
              </a>
              <a href="/learning" className="block text-gray-600 hover:text-pink-600 text-sm transition-colors font-medium">
                Learning 📚
              </a>
              <a href="/experience" className="block text-gray-600 hover:text-pink-600 text-sm transition-colors font-medium">
                Experience 💼
              </a>
              <a href="/blog" className="block text-gray-600 hover:text-pink-600 text-sm transition-colors font-medium">
                Blog 📝
              </a>
            </div>
          </div>

          {/* Connect */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
              💌 Connect
            </h3>
            <div className="flex space-x-4">
              <a
                href="https://github.com/DemiInfinity"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 text-white hover:scale-110 transition-transform"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://www.linkedin.com/in/demi-taylor-nimmo-bb320b40"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 text-white hover:scale-110 transition-transform"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="mailto:demi.21@outlook.com"
                className="p-2 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 text-white hover:scale-110 transition-transform"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-pink-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 text-sm font-medium">
              © {currentYear} Demi Taylor Nimmo. All rights reserved. ✨
            </p>
            <p className="text-gray-600 text-sm flex items-center mt-2 md:mt-0 font-medium">
              Built with <Heart className="w-4 h-4 mx-1 text-pink-500" /> using Next.js & TypeScript 💖
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
