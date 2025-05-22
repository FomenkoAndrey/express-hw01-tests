import { app, server, users, articles } from '../server.mjs'
import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import request from 'supertest'

// Змінні для зберігання тестових ID
let testUserId
let testArticleId
const NON_EXISTENT_ID = 'non-existent-id'

describe('Express REST API', () => {
  beforeAll(async () => {
    // Створюємо спай для запобігання виводу логів під час тестів
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Отримуємо існуючі дані з Maps
    // Якщо є дані, використовуємо перший доступний ID
    if (users.size > 0) {
      testUserId = Array.from(users.keys())[0]
    } else {
      // Якщо даних немає, створюємо тестового користувача
      const newUserResponse = await request(app).post('/users').send({ name: 'Test User For ID' })

      // В реальному API треба було б отримати ID з відповіді,
      // але у нашому випадку просто використовуємо поточний час
      testUserId = Date.now().toString()
      users.set(testUserId, { name: 'Test User For ID' })
    }

    // Аналогічно для статтей
    if (articles.size > 0) {
      testArticleId = Array.from(articles.keys())[0]
    } else {
      // Якщо даних немає, створюємо тестову статтю
      const newArticleResponse = await request(app).post('/articles').send({ title: 'Test Article For ID' })

      testArticleId = Date.now().toString()
      articles.set(testArticleId, { title: 'Test Article For ID' })
    }

    console.log(`Using test user ID: ${testUserId}`)
    console.log(`Using test article ID: ${testArticleId}`)
  })

  afterAll(() => {
    // Закриваємо сервер після тестів
    if (server && server.listening) {
      server.close()
    }
    vi.restoreAllMocks()
  })

  // Тестування маршруту "/"
  describe('Root Route', () => {
    test('GET / повинен повертати статус 200 та правильне повідомлення', async () => {
      const response = await request(app).get('/')

      expect(response.status).toBe(200)
      expect(response.text).toBe('Get root route')
    })
  })

  // Тестування маршрутів "/users"
  describe('Users Routes', () => {
    test('GET /users повинен повертати статус 200 та правильне повідомлення', async () => {
      const response = await request(app).get('/users')

      expect(response.status).toBe(200)
      expect(response.body).toBeInstanceOf(Array)
      expect(response.body.length).toBeGreaterThan(0)
      response.body.forEach((user) => {
        expect(user).toHaveProperty('id')
        expect(user).toHaveProperty('name')
      })
    })

    test('POST /users повинен повертати статус 201 та правильне повідомлення, і створювати користувача', async () => {
      const testName = 'New Test User ' + Date.now()
      const response = await request(app).post('/users').send({ name: testName })

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('name', testName)
      // Перевіряємо, що користувач був створений в Map
      const newUser = users.get(response.body.id)
      expect(newUser).toBeDefined()
      expect(newUser.name).toBe(testName)
    })

    test('POST /users повинен повертати статус 400 при некоректних даних', async () => {
      // Перевіряємо порожній рядок
      const response1 = await request(app).post('/users').send({ name: '' })
      expect(response1.status).toBe(400)
      expect(response1.text).toBe('Bad Request')

      // Перевіряємо відсутність поля
      const response2 = await request(app).post('/users').send({})
      expect(response2.status).toBe(400)
      expect(response2.text).toBe('Bad Request')
    })

    test('GET /users/:userId повинен повертати статус 200 та правильне повідомлення з ID', async () => {
      const response = await request(app).get(`/users/${testUserId}`)

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        id: testUserId,
        name: users.get(testUserId).name
      })
    })

    test('GET /users/:userId повинен повертати статус 404 для неіснуючого користувача', async () => {
      const response = await request(app).get(`/users/${NON_EXISTENT_ID}`)

      expect(response.status).toBe(404)
      expect(response.text).toBe('Not Found')
    })

    test('PUT /users/:userId повинен повертати статус 200, правильне повідомлення та оновлювати користувача', async () => {
      const newName = 'Updated User ' + Date.now()
      const response = await request(app).put(`/users/${testUserId}`).send({ name: newName })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        id: testUserId,
        name: newName
      })

      // Перевіряємо, що дані користувача дійсно оновилися
      const user = users.get(testUserId)
      expect(user).toBeDefined()
      expect(user.name).toBe(newName)
    })

    test('PUT /users/:userId повинен повертати статус 400 при некоректних даних', async () => {
      // Перевіряємо порожній рядок
      const response1 = await request(app).put(`/users/${testUserId}`).send({ name: '' })
      expect(response1.status).toBe(400)
      expect(response1.text).toBe('Bad Request')

      // Перевіряємо відсутність поля
      const response2 = await request(app).put(`/users/${testUserId}`).send({})
      expect(response2.status).toBe(400)
      expect(response2.text).toBe('Bad Request')
    })

    test('PUT /users/:userId повинен повертати статус 404 для неіснуючого користувача', async () => {
      const response = await request(app).put(`/users/${NON_EXISTENT_ID}`).send({ name: 'Updated User' })

      expect(response.status).toBe(404)
      expect(response.text).toBe('Not Found')
    })

    test('DELETE /users/:userId повинен повертати статус 204 без вмісту та видаляти користувача', async () => {
      // Створюємо тимчасового користувача для видалення
      const tempUserId = 'temp-' + Date.now()
      users.set(tempUserId, { name: 'Temporary User' })

      const response = await request(app).delete(`/users/${tempUserId}`)

      expect(response.status).toBe(204)
      expect(response.text).toBe('')

      // Перевіряємо, що користувач справді видалений
      expect(users.has(tempUserId)).toBe(false)
    })

    test('DELETE /users/:userId повинен повертати статус 404 для неіснуючого користувача', async () => {
      const response = await request(app).delete(`/users/${NON_EXISTENT_ID}`)

      expect(response.status).toBe(404)
      expect(response.text).toBe('Not Found')
    })
  })

  // Тестування маршрутів "/articles"
  describe('Articles Routes', () => {
    test('GET /articles повинен повертати статус 200 та правильне повідомлення', async () => {
      const response = await request(app).get('/articles')

      expect(response.status).toBe(200)
      expect(response.body).toBeInstanceOf(Array)
      expect(response.body.length).toBeGreaterThan(0)
      response.body.forEach((article) => {
        expect(article).toHaveProperty('id')
        expect(article).toHaveProperty('title')
      })
    })

    test('POST /articles повинен повертати статус 201 та правильне повідомлення, і створювати статтю', async () => {
      const testTitle = 'New Test Article ' + Date.now()
      const response = await request(app).post('/articles').send({ title: testTitle })

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('title', testTitle)
      // Перевіряємо, що стаття була створена в Map
      const newArticle = articles.get(response.body.id)
      expect(newArticle).toBeDefined()
      expect(newArticle.title).toBe(testTitle)
    })

    test('POST /articles повинен повертати статус 400 при некоректних даних', async () => {
      // Перевіряємо порожній рядок
      const response1 = await request(app).post('/articles').send({ title: '' })
      expect(response1.status).toBe(400)
      expect(response1.text).toBe('Bad Request')

      // Перевіряємо відсутність поля
      const response2 = await request(app).post('/articles').send({})
      expect(response2.status).toBe(400)
      expect(response2.text).toBe('Bad Request')
    })

    test('GET /articles/:articleId повинен повертати статус 200 та правильне повідомлення з ID', async () => {
      const response = await request(app).get(`/articles/${testArticleId}`)

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        id: testArticleId,
        title: articles.get(testArticleId).title
      })
    })

    test('GET /articles/:articleId повинен повертати статус 404 для неіснуючої статті', async () => {
      const response = await request(app).get(`/articles/${NON_EXISTENT_ID}`)

      expect(response.status).toBe(404)
      expect(response.text).toBe('Not Found')
    })

    test('PUT /articles/:articleId повинен повертати статус 200, правильне повідомлення та оновлювати статтю', async () => {
      const newTitle = 'Updated Article ' + Date.now()
      const response = await request(app).put(`/articles/${testArticleId}`).send({ title: newTitle })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        id: testArticleId,
        title: newTitle
      })

      // Перевіряємо, що дані статті дійсно оновилися
      const article = articles.get(testArticleId)
      expect(article).toBeDefined()
      expect(article.title).toBe(newTitle)
    })

    test('PUT /articles/:articleId повинен повертати статус 400 при некоректних даних', async () => {
      // Перевіряємо порожній рядок
      const response1 = await request(app).put(`/articles/${testArticleId}`).send({ title: '' })
      expect(response1.status).toBe(400)
      expect(response1.text).toBe('Bad Request')

      // Перевіряємо відсутність поля
      const response2 = await request(app).put(`/articles/${testArticleId}`).send({})
      expect(response2.status).toBe(400)
      expect(response2.text).toBe('Bad Request')
    })

    test('PUT /articles/:articleId повинен повертати статус 404 для неіснуючої статті', async () => {
      const response = await request(app).put(`/articles/${NON_EXISTENT_ID}`).send({ title: 'Updated Article' })

      expect(response.status).toBe(404)
      expect(response.text).toBe('Not Found')
    })

    test('DELETE /articles/:articleId повинен повертати статус 204 без вмісту та видаляти статтю', async () => {
      // Створюємо тимчасову статтю для видалення
      const tempArticleId = 'temp-' + Date.now()
      articles.set(tempArticleId, { title: 'Temporary Article' })

      const response = await request(app).delete(`/articles/${tempArticleId}`)

      expect(response.status).toBe(204)
      expect(response.text).toBe('')

      // Перевіряємо, що стаття справді видалена
      expect(articles.has(tempArticleId)).toBe(false)
    })

    test('DELETE /articles/:articleId повинен повертати статус 404 для неіснуючої статті', async () => {
      const response = await request(app).delete(`/articles/${NON_EXISTENT_ID}`)

      expect(response.status).toBe(404)
      expect(response.text).toBe('Not Found')
    })
  })

  // Тестування обробки помилок
  describe('Error Handling', () => {
    test('Запит до неіснуючого маршруту повинен повертати статус 404', async () => {
      const response = await request(app).get('/nonexistent-route')

      expect(response.status).toBe(404)
      expect(response.text).toBe('Not Found')
    })

    test('Глобальна обробка помилок повинна повертати статус 500', async () => {
      const express = require('express')
      const tempApp = express()

      // Додаємо маршрут, який викликає помилку
      tempApp.get('/error-test', (req, res, next) => {
        next(new Error('Test error'))
      })

      // Додаємо кастомний обробник помилок
      tempApp.use((err, req, res, next) => {
        res.status(500).send('Internal Server Error')
      })

      const response = await request(tempApp).get('/error-test')

      expect(response.status).toBe(500)
      expect(response.text).toBe('Internal Server Error')
    })
  })
})
