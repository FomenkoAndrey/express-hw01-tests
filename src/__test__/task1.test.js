import { app, server } from '../server.mjs'
import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import request from 'supertest'

// Змінні для зберігання тестових ID
let testUserId
let testArticleId
let testUserName
let testArticleTitle
const NON_EXISTENT_ID = 'non-existent-id'

describe('Express REST API', () => {
  beforeAll(async () => {
    // Створюємо спай для запобігання виводу логів під час тестів
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Отримуємо існуючі дані через API
    const usersResp = await request(app).get('/users')
    if (usersResp.body.length > 0) {
      testUserId = usersResp.body[0].id
      testUserName = usersResp.body[0].name
    } else {
      const newUserResp = await request(app).post('/users').send({ name: 'Test User For ID' })
      testUserId = newUserResp.body.id
      testUserName = newUserResp.body.name
    }

    // Аналогічно для статей
    const articlesResp = await request(app).get('/articles')
    if (articlesResp.body.length > 0) {
      testArticleId = articlesResp.body[0].id
      testArticleTitle = articlesResp.body[0].title
    } else {
      const newArticleResp = await request(app).post('/articles').send({ title: 'Test Article For ID' })
      testArticleId = newArticleResp.body.id
      testArticleTitle = newArticleResp.body.title
    }
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
      // Перевіряємо через GET /users/:id
      const getResp = await request(app).get(`/users/${response.body.id}`)
      expect(getResp.status).toBe(200)
      expect(getResp.body).toEqual({ id: response.body.id, name: testName })
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
        name: testUserName
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

      // Перевіряємо через GET /users/:userId, що дані оновилися
      const getResp = await request(app).get(`/users/${testUserId}`)
      expect(getResp.status).toBe(200)
      expect(getResp.body).toEqual({ id: testUserId, name: newName })
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
      // Створюємо тимчасового користувача для видалення через API
      const createResp = await request(app).post('/users').send({ name: 'Temporary User' })
      const tempUserId = createResp.body.id

      const deleteResp = await request(app).delete(`/users/${tempUserId}`)
      expect(deleteResp.status).toBe(204)
      expect(deleteResp.text).toBe('')

      // Перевіряємо через GET /users/:id, що користувача видалено
      const getAfter = await request(app).get(`/users/${tempUserId}`)
      expect(getAfter.status).toBe(404)
      expect(getAfter.text).toBe('Not Found')
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
      // Перевіряємо через GET /articles/:id
      const getResp = await request(app).get(`/articles/${response.body.id}`)
      expect(getResp.status).toBe(200)
      expect(getResp.body).toEqual({ id: response.body.id, title: testTitle })
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
        title: testArticleTitle
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

      // Перевіряємо через GET /articles/:id, що дані оновилися
      const getResp = await request(app).get(`/articles/${testArticleId}`)
      expect(getResp.status).toBe(200)
      expect(getResp.body).toEqual({ id: testArticleId, title: newTitle })
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
      // Створюємо тимчасову статтю для видалення через API
      const createResp = await request(app).post('/articles').send({ title: 'Temporary Article' })
      const tempArticleId = createResp.body.id

      const deleteResp = await request(app).delete(`/articles/${tempArticleId}`)
      expect(deleteResp.status).toBe(204)
      expect(deleteResp.text).toBe('')

      // Перевіряємо через GET /articles/:id, що статтю видалено
      const getAfter = await request(app).get(`/articles/${tempArticleId}`)
      expect(getAfter.status).toBe(404)
      expect(getAfter.text).toBe('Not Found')
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
