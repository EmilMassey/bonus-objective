const express = require('express')
const NotFoundError = require('./error/NotFoundError')
const DataManager = require('./DataManager')
const { ValidationError } = require('joi')
const Joi = require('joi')
const pug = require('pug')
const cors = require('cors')
const basicAuth = require('express-basic-auth')
const bcrypt = require('bcrypt')

const app = express()
const port = 80
const dataManager = new DataManager('data.json')

const getSummary = async () => {
  const profit = await dataManager.get('profit')
  const objective = await dataManager.get('objective')
  const progress = profit / objective
  return { profit, objective, progress }
}

const authorizer = async (username, password, callback) => {
  const admins = await dataManager.get('admins')

  if (!admins.hasOwnProperty(username)) {
    callback(null, false)

    return
  }

  callback(null, await bcrypt.compare(password, admins[username]))
}

app.get('/', async (req, res) => {
  res.send(pug.renderFile(`${__dirname}/templates/summary.pug`, await getSummary()))
})

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/api', async (req, res) => {
  res.send(await getSummary())
})

app.get('/api/objective', async function (req, res, next) {
  try {
    const objective = await dataManager.get('objective')
    res.send({ objective })
  } catch (e) {
    return next(e)
  }
})

app.get('/api/profit', async function (req, res, next) {
  try {
    const profit = await dataManager.get('profit')
    res.send({ profit })
  } catch (e) {
    return next(e)
  }
})

app.get('/api/progress', async function (req, res, next) {
  try {
    const profit = await dataManager.get('profit')
    const objective = await dataManager.get('objective')
    res.send({ progress: profit / objective })
  } catch (e) {
    return next(e)
  }
})

app.use(
  basicAuth({
    authorizer: authorizer,
    authorizeAsync: true,
    challenge: true,
    unauthorizedResponse: () => {
      return { error: 'Unauthorized' }
    },
  }),
)

app.put('/api/objective', async function (req, res, next) {
  let objective

  try {
    const body = await Joi.object({ objective: Joi.number().min(1).required() }).validateAsync(
      req.body,
    )
    objective = body.objective
    await dataManager.update('objective', objective)
  } catch (e) {
    return next(e)
  }

  res.send({ objective })
})

app.put('/api/profit', async function (req, res, next) {
  let profit

  try {
    const body = await Joi.object({ profit: Joi.number().required() }).validateAsync(req.body)
    profit = body.profit
    await dataManager.update('profit', profit)
  } catch (e) {
    return next(e)
  }

  res.send({ profit })
})

app.get('/admin', async (req, res) => {
  res.send(pug.renderFile(`${__dirname}/templates/admin-form.pug`, await getSummary()))
})

app.post('/admin', async (req, res) => {
  let data

  try {
    data = await Joi.object({
      profit: Joi.number().required(),
      objective: Joi.number().min(1).required(),
    }).validateAsync(req.body)
  } catch (e) {
    res.status = 400
    res.send(
      pug.renderFile(`${__dirname}/templates/admin-form.pug`, {
        ...(await getSummary()),
        error: e.message,
      }),
    )

    return
  }

  await dataManager.update('profit', data.profit)
  await dataManager.update('objective', data.objective)

  res.send(
    pug.renderFile(`${__dirname}/templates/admin-form.pug`, {
      profit: data.profit,
      objective: data.objective,
      success: true,
    }),
  )
})

app.use(function (err, req, res, next) {
  if (err instanceof ValidationError) {
    res.status(400)
    res.json({ error: 'Validation Failed', details: err.details })

    return
  }

  if (err instanceof NotFoundError) {
    res.status(404)
    res.json({ error: 'Not Found', message: err.message })

    return
  }

  if (err.status) {
    res.status(err.status)
    res.json({ error: err.message })

    return
  }

  console.error(err)
  res.status(500)
  res.json({ error: 'Internal Server Error' })
})

app.use(function (req, res) {
  res.status(404)
  res.json({ error: 'Not Found' })
})

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})
