import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { api } from '@/lib/api'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { ImageUploadButton } from '@/components/ImageUploadButton'

interface BlogPost {
  id: number
  title: string
  slug: string
  excerpt: string
  content: string
  author: string
  publish_date: string
  read_time: number
  category: string
  tags: string[]
  featured: boolean
  published: boolean
  cover_image?: string | null
}

interface BlogForm {
  title: string
  slug: string
  excerpt: string
  content: string
  author: string
  publish_date: string
  read_time: number
  category: string
  tags: string
  featured: boolean
  published: boolean
  cover_image: string
}

const Blog = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const queryClient = useQueryClient()

  const { data: posts, isLoading } = useQuery('blog-posts', async () => {
    const response = await api.get('/blog/admin/all')
    return response.data.data as BlogPost[]
  })

  const { register, handleSubmit, reset, setValue, getValues, formState: { errors } } = useForm<BlogForm>()

  const createMutation = useMutation(
    (data: BlogForm) => api.post('/blog', {
      ...data,
      tags: data.tags.split(',').map(t => t.trim()).filter(t => t)
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('blog-posts')
        toast.success('Blog post created successfully')
        setIsModalOpen(false)
        reset()
      },
      onError: (error: any) => {
        const message = error.response?.data?.error || 'Failed to create blog post'
        toast.error(message)
      }
    }
  )

  const updateMutation = useMutation(
    ({ id, data }: { id: number, data: BlogForm }) => api.put(`/blog/${id}`, {
      ...data,
      tags: data.tags.split(',').map(t => t.trim()).filter(t => t)
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('blog-posts')
        toast.success('Blog post updated successfully')
        setIsModalOpen(false)
        setEditingPost(null)
        reset()
      },
      onError: (error: any) => {
        const message = error.response?.data?.error || 'Failed to update blog post'
        toast.error(message)
      }
    }
  )

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/blog/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('blog-posts')
        toast.success('Blog post deleted successfully')
      },
      onError: (error: any) => {
        const message = error.response?.data?.error || 'Failed to delete blog post'
        toast.error(message)
      }
    }
  )

  const onSubmit = (data: BlogForm) => {
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const openModal = (post?: BlogPost) => {
    if (post) {
      setEditingPost(post)
      // Format publish_date for date input
      const formattedDate = post.publish_date ? new Date(post.publish_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      
      reset({
        title: post.title || '',
        slug: post.slug || '',
        excerpt: post.excerpt || '',
        content: post.content || '',
        author: post.author || 'Admin',
        publish_date: formattedDate,
        read_time: post.read_time || 5,
        category: post.category || '',
        tags: Array.isArray(post.tags) ? post.tags.join(', ') : '',
        featured: post.featured || false,
        published: post.published || false,
        cover_image: post.cover_image || ''
      })
    } else {
      setEditingPost(null)
      reset({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        author: 'Admin',
        publish_date: new Date().toISOString().split('T')[0],
        read_time: 5,
        category: '',
        tags: '',
        featured: false,
        published: false,
        cover_image: ''
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPost(null)
    reset()
  }

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    if (!editingPost) {
      setValue('slug', generateSlug(title))
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your amazing blog posts... 📝</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text" style={{ fontFamily: 'Playfair Display, serif' }}>📝 Blog Posts</h1>
          <p className="mt-2 text-gray-600 font-medium">
            Manage your beautiful articles and publications ✨
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="btn-primary floating-hearts"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </button>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {posts?.map((post) => (
          <div key={post.id} className="card p-6 hover:scale-105 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {post.title}
                  </h3>
                  <div className="flex space-x-2">
                    {post.featured && (
                      <span className="px-3 py-1 text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full">
                        ⭐ Featured
                      </span>
                    )}
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      post.published 
                        ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' 
                        : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                    }`}>
                      {post.published ? '🚀 Published' : '📝 Draft'}
                    </span>
                  </div>
                </div>
                <p className="text-gray-600 line-clamp-2 font-medium mb-3">
                  {post.excerpt}
                </p>
                <div className="flex items-center text-sm text-pink-600 space-x-4 mb-3">
                  <span className="flex items-center">📂 {post.category}</span>
                  <span className="flex items-center">⏱️ {post.read_time} min read</span>
                  <span className="flex items-center">📅 {post.publish_date ? new Date(post.publish_date).toLocaleDateString() : 'Date not available'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-3 py-1 text-xs bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                  {post.tags.length > 3 && (
                    <span className="px-3 py-1 text-xs bg-gray-100 text-gray-500 rounded-full font-medium">
                      +{post.tags.length - 3} more
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {post.published && (
                  <a
                    href={`https://demitaylornimmo.com/blog/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                    title="View Post"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => openModal(post)}
                  className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this blog post? 💔')) {
                      deleteMutation.mutate(post.id)
                    }
                  }}
                  className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="modal-overlay fixed inset-0" onClick={closeModal}></div>
            <div className="modal-content inline-block align-bottom text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="modal-header">
                  <h3 className="text-xl font-bold">
                    {editingPost ? '✨ Edit Blog Post' : '📝 Create Blog Post'}
                  </h3>
                </div>
                <div className="modal-body max-h-[60vh] overflow-y-auto">
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div className="form-group">
                        <label className="form-label">📝 Blog Title</label>
                        <input
                          {...register('title', { 
                            required: 'Title is required',
                            onChange: (e) => handleTitleChange(e.target.value)
                          })}
                          type="text"
                          className="form-input"
                          placeholder="My Amazing Blog Post"
                        />
                        {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">🔗 URL Slug</label>
                        <input
                          {...register('slug', { 
                            required: 'Slug is required',
                            pattern: {
                              value: /^[a-z0-9-]+$/,
                              message: 'Slug can only contain lowercase letters, numbers, and hyphens'
                            }
                          })}
                          type="text"
                          className="form-input"
                          placeholder="my-amazing-blog-post"
                        />
                        {errors.slug && <p className="text-red-500 text-sm mt-1">{errors.slug.message}</p>}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">📊 Excerpt</label>
                      <textarea
                        {...register('excerpt', { required: 'Excerpt is required' })}
                        rows={3}
                        className="form-textarea"
                        placeholder="A brief summary of your blog post..."
                      />
                      {errors.excerpt && <p className="text-red-500 text-sm mt-1">{errors.excerpt.message}</p>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">🖼️ Cover image URL (optional)</label>
                      <p className="text-sm text-gray-500 mb-2">Shown at the top of the post and in social previews.</p>
                      <input
                        {...register('cover_image')}
                        type="url"
                        className="form-input"
                        placeholder="https://… or upload below"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <ImageUploadButton
                          label="Upload → set cover"
                          onUploaded={(url) => setValue('cover_image', url)}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">✍️ Content</label>
                      <p className="text-sm text-gray-500 mb-2">
                        Markdown supported. Inline images: <code className="bg-pink-50 px-1 rounded">![description](image URL)</code>
                      </p>
                      <textarea
                        {...register('content', { required: 'Content is required' })}
                        rows={15}
                        className="form-textarea"
                        placeholder="Write your amazing blog post content here... (Markdown supported) ✨"
                      />
                      {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>}
                      <div className="mt-2">
                        <ImageUploadButton
                          label="Upload → insert image in content"
                          onUploaded={(url) => {
                            const cur = getValues('content') || ''
                            setValue('content', `${cur}\n\n![](${url})\n`)
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                      <div className="form-group">
                        <label className="form-label">👩‍💻 Author</label>
                        <input
                          {...register('author', { required: 'Author is required' })}
                          type="text"
                          className="form-input"
                          placeholder="Demi Taylor Nimmo"
                        />
                        {errors.author && <p className="text-red-500 text-sm mt-1">{errors.author.message}</p>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">📂 Category</label>
                        <input
                          {...register('category', { required: 'Category is required' })}
                          type="text"
                          className="form-input"
                          placeholder="Technology, Tutorial, etc."
                        />
                        {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">⏱️ Read Time (minutes)</label>
                        <input
                          {...register('read_time', { 
                            required: 'Read time is required',
                            min: { value: 1, message: 'Read time must be at least 1 minute' }
                          })}
                          type="number"
                          min="1"
                          className="form-input"
                          placeholder="5"
                        />
                        {errors.read_time && <p className="text-red-500 text-sm mt-1">{errors.read_time.message}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div className="form-group">
                        <label className="form-label">🏷️ Tags (comma-separated)</label>
                        <input
                          {...register('tags')}
                          type="text"
                          placeholder="React, TypeScript, Tutorial, Web Development"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">📅 Publish Date</label>
                        <input
                          {...register('publish_date', { required: 'Publish date is required' })}
                          type="date"
                          className="form-input"
                        />
                        {errors.publish_date && <p className="text-red-500 text-sm mt-1">{errors.publish_date.message}</p>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-8">
                      <div className="flex items-center space-x-3">
                        <input
                          {...register('featured')}
                          type="checkbox"
                          className="h-5 w-5 text-pink-600 focus:ring-pink-500 border-pink-300 rounded"
                          id="featured"
                        />
                        <label htmlFor="featured" className="text-sm font-medium text-gray-700">⭐ Featured post (show on homepage)</label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          {...register('published')}
                          type="checkbox"
                          className="h-5 w-5 text-pink-600 focus:ring-pink-500 border-pink-300 rounded"
                          id="published"
                        />
                        <label htmlFor="published" className="text-sm font-medium text-gray-700">🚀 Publish immediately</label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isLoading || updateMutation.isLoading}
                    className="btn-success"
                  >
                    {createMutation.isLoading || updateMutation.isLoading ? (
                      <div className="flex items-center">
                        <div className="spinner w-4 h-4 mr-2"></div>
                        Saving...
                      </div>
                    ) : (
                      editingPost ? '✨ Update Post' : '📝 Create Post'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Blog
