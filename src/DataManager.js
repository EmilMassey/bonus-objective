const fs = require('fs')
const NotFoundError = require('./error/NotFoundError')

const DATA_DIRECTORY = `${__dirname}/../data`

class DataManager {
  /**
   * @param {string} filename
   */
  constructor(filename) {
    this.filepath = `${DATA_DIRECTORY}/${filename}`
  }

  /**
   * @returns {Promise<object>}
   */
  read() {
    return new Promise((resolve, reject) => {
      fs.access(this.filepath, fs.F_OK, (err) => {
        if (err) {
          reject(err)

          return
        }

        fs.readFile(this.filepath, (err, data) => {
          if (err) {
            reject(err)

            return
          }

          try {
            data = JSON.parse(data.toString('utf-8'))

            if (typeof data !== 'object') {
              reject(new Error('Data is not an object'))

              return
            }

            resolve(data || {})
          } catch (e) {
            reject(e)
          }
        })
      })
    })
  }

  /**
   * @param {object} data
   *
   * @return {Promise<void>}
   */
  write(data) {
    return new Promise((resolve, reject) => {
      if (typeof data !== 'object') {
        reject(new Error('Data is not an object'))

        return
      }

      const content = JSON.stringify(data, null, 2)

      fs.writeFile(this.filepath, content, (err) => {
        if (err) {
          reject(err)

          return
        }

        resolve()
      })
    })
  }

  /**
   * @param {string} key
   * @return {Promise}
   */
  async get(key) {
    const entries = await this.read()

    if (!entries.hasOwnProperty(key)) {
      throw new NotFoundError(`Key ${key} does not exist`)
    }

    return entries[key]
  }

  /**
   * @param {string} key
   * @param value
   * @return {Promise<void>}
   */
  async update(key, value) {
    const entries = await this.read()

    entries[key] = value
    await this.write(entries)
  }

  /**
   * @param {string} lookupKey
   * @return {Promise<void>}
   */
  async delete(lookupKey) {
    const entries = await this.read()

    if (!entries || !entries.hasOwnProperty(lookupKey)) {
      return
    }

    delete entries[lookupKey]

    await this.write(entries)
  }
}

module.exports = DataManager
