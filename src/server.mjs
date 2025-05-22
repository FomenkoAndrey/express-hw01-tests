// Реалізація RESTful API сервера відповідно до завдання, описаного у файлі ASSIGNMENT.md

import express from 'express'

// Константи
const PORT = 3000
const app = express()

// Імітація бази даних
const users = new Map()
const articles = new Map()

// Middleware для обробки JSON
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Маршрути для кореневого шляху
app.get('/', (req, res) => {
  res.status(200).send('Get root route')
})

// Маршрути для користувачів
app.get('/users', (req, res) => {
  const allUsers = Array.from(users.entries()).map(([id, user]) => ({ id, ...user }))
  res.status(200).json(allUsers)
})

app.post('/users', (req, res) => {
  // Валідація даних
  if (!req.body.name || req.body.name.trim() === '') {
    return res.status(400).send('Bad Request')
  }

  // Логіка для створення користувача
  const userId = Date.now().toString()
  users.set(userId, { name: req.body.name })

  res.status(201).json({ id: userId, name: req.body.name })
})

app.get('/users/:userId', (req, res) => {
  // Перевірка існування користувача
  if (!users.has(req.params.userId)) {
    return res.status(404).send('Not Found')
  }

  const user = users.get(req.params.userId)
  res.status(200).json({ id: req.params.userId, ...user })
})

app.put('/users/:userId', (req, res) => {
  // Перевірка існування користувача
  if (!users.has(req.params.userId)) {
    return res.status(404).send('Not Found')
  }

  // Валідація даних
  if (!req.body.name || req.body.name.trim() === '') {
    return res.status(400).send('Bad Request')
  }

  // Оновлення користувача
  users.set(req.params.userId, { name: req.body.name })

  res.status(200).json({ id: req.params.userId, name: req.body.name })
})

app.delete('/users/:userId', (req, res) => {
  // Перевірка існування користувача
  if (!users.has(req.params.userId)) {
    return res.status(404).send('Not Found')
  }

  // Видалення користувача
  users.delete(req.params.userId)

  res.status(204).send()
})

// Маршрути для статей
app.get('/articles', (req, res) => {
  const allArticles = Array.from(articles.entries()).map(([id, article]) => ({ id, ...article }))
  res.status(200).json(allArticles)
})

app.post('/articles', (req, res) => {
  // Валідація даних
  if (!req.body.title || req.body.title.trim() === '') {
    return res.status(400).send('Bad Request')
  }

  // Логіка для створення статті
  const articleId = Date.now().toString()
  articles.set(articleId, { title: req.body.title })

  res.status(201).json({ id: articleId, title: req.body.title })
})

app.get('/articles/:articleId', (req, res) => {
  // Перевірка існування статті
  if (!articles.has(req.params.articleId)) {
    return res.status(404).send('Not Found')
  }

  const article = articles.get(req.params.articleId)
  res.status(200).json({ id: req.params.articleId, ...article })
})

app.put('/articles/:articleId', (req, res) => {
  // Перевірка існування статті
  if (!articles.has(req.params.articleId)) {
    return res.status(404).send('Not Found')
  }

  // Валідація даних
  if (!req.body.title || req.body.title.trim() === '') {
    return res.status(400).send('Bad Request')
  }

  // Оновлення статті
  articles.set(req.params.articleId, { title: req.body.title })

  res.status(200).json({ id: req.params.articleId, title: req.body.title })
})

app.delete('/articles/:articleId', (req, res) => {
  // Перевірка існування статті
  if (!articles.has(req.params.articleId)) {
    return res.status(404).send('Not Found')
  }

  // Видалення статті
  articles.delete(req.params.articleId)

  res.status(204).send()
})

// Обробка помилок для неіснуючих маршрутів
app.use((req, res) => {
  res.status(404).send('Not Found')
})

// Глобальна обробка помилок
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Internal Server Error')
})

// Запуск сервера
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

// Експорт для тестів
export { server, app }
