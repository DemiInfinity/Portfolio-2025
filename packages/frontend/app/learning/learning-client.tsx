'use client'

import { motion } from 'framer-motion'
import { BookOpen, CheckCircle, Clock, Target, TrendingUp } from 'lucide-react'

interface LearningItem {
  id: number
  title: string
  description: string
  progress?: number
  category: string
  startDate?: string
  estimatedCompletion?: string
  completedDate?: string
  level?: string
  resources?: string[]
}

interface LearningClientProps {
  currentLearning: LearningItem[]
  completedSkills: LearningItem[]
  learningGoals: string[]
}

export default function LearningClient({
  currentLearning,
  completedSkills,
  learningGoals,
}: LearningClientProps) {
  return (
    <div className="min-h-screen py-20" style={{ background: 'linear-gradient(135deg, #fff8f0 0%, #f8f4ff 50%, #fdf2f8 100%)' }}>
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 text-4xl opacity-15 float-animation">📚</div>
        <div className="absolute top-40 right-20 text-3xl opacity-20 sparkle-animation">✨</div>
        <div className="absolute bottom-40 left-20 text-5xl opacity-10 float-animation">🎓</div>
        <div className="absolute bottom-20 right-10 text-3xl opacity-15 sparkle-animation">💡</div>
        <div className="absolute top-1/2 left-1/4 text-3xl opacity-10">🌟</div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl sm:text-6xl font-bold gradient-text mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
            📚 Learning Journey
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto font-medium">
            Continuous learning is key to staying current in technology. Here's what I'm currently
            studying and what I've mastered! ✨
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
        >
          <div className="card p-6 hover:scale-105 transition-transform">
            <div className="flex items-center">
              <div className="p-3 rounded-lg float-animation" style={{ background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' }}>
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>{currentLearning.length}</p>
                <p className="text-gray-600 font-medium">Currently Learning 📖</p>
              </div>
            </div>
          </div>
          
          <div className="card p-6 hover:scale-105 transition-transform">
            <div className="flex items-center">
              <div className="p-3 rounded-lg float-animation" style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>{completedSkills.length}</p>
                <p className="text-gray-600 font-medium">Skills Mastered ✅</p>
              </div>
            </div>
          </div>
          
          <div className="card p-6 hover:scale-105 transition-transform">
            <div className="flex items-center">
              <div className="p-3 rounded-lg float-animation" style={{ background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' }}>
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>{learningGoals.length}</p>
                <p className="text-gray-600 font-medium">Future Goals 🎯</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Currently Learning */}
        <section className="mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-4xl font-bold gradient-text mb-8 flex items-center" style={{ fontFamily: 'Playfair Display, serif' }}
          >
            <Clock className="w-8 h-8 mr-3 text-pink-600" />
            📖 Currently Learning
          </motion.h2>
          
          <div className="space-y-6">
            {currentLearning.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card p-6 hover:scale-105 transition-transform"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {item.title}
                    </h3>
                    <span className="tech-tag">
                      {item.category}
                    </span>
                  </div>
                  <div className="mt-4 lg:mt-0 lg:text-right">
                    <p className="text-sm text-pink-600 font-medium">
                      Started: {item.startDate ? new Date(item.startDate).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-sm text-pink-600 font-medium">
                      Target: {item.estimatedCompletion ? new Date(item.estimatedCompletion).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-4 font-medium">
                  {item.description}
                </p>
                
                {item.progress !== undefined && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-gray-700">Progress ✨</span>
                      <span className="text-sm font-semibold text-pink-600">{item.progress}%</span>
                    </div>
                    <div className="w-full bg-pink-100 rounded-full h-3">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-pink-400 to-purple-500"
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {item.resources && item.resources.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Resources: 📖</p>
                    <div className="flex flex-wrap gap-2">
                      {item.resources.map((resource) => (
                        <span
                          key={resource}
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                        >
                          {resource}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Completed Skills - Only show if there are completed skills */}
        {completedSkills.length > 0 && (
          <section className="mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-4xl font-bold gradient-text mb-8 flex items-center" style={{ fontFamily: 'Playfair Display, serif' }}
            >
              <CheckCircle className="w-8 h-8 mr-3 text-pink-600" />
              ✅ Completed Skills
            </motion.h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {completedSkills.map((skill, index) => (
                <motion.div
                  key={skill.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="card p-6 hover:scale-105 transition-transform"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {skill.title}
                    </h3>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-pink-400 to-purple-500 text-white">
                      {skill.level}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-3 font-medium">
                    {skill.description}
                  </p>
                  
                  <div className="flex items-center">
                    <span className="tech-tag">
                      {skill.category}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Learning Goals */}
        <section>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-4xl font-bold gradient-text mb-8 flex items-center" style={{ fontFamily: 'Playfair Display, serif' }}
          >
            <TrendingUp className="w-8 h-8 mr-3 text-pink-600" />
            🎯 Future Learning Goals
          </motion.h2>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="card p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {learningGoals.map((goal, index) => (
                <div
                  key={index}
                  className="flex items-center p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg hover:scale-105 transition-transform"
                >
                  <Target className="w-5 h-5 text-pink-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">{goal}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  )
}

