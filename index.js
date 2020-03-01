const express = require('express')
const imaps = require('imap-simple')
const cors = require('cors')
const fs = require('fs')
const simpleParser = require('mailparser').simpleParser
const _ = require('lodash')
const iconv = require('iconv-lite')
const { getFiles, authorize, downloadAttachment } = require('./server-gapi')
const mime = require('mime-types')
const path = require('path')


const hostname = '127.0.0.1'
const port = 4321
const app = express()

app.use(cors())


const findUrls = text => {
  const pattern = /https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,}/
  return pattern.exec(text)
}


const sendFilesList = res => {
  return auth => {
    getFiles(auth).then(files => {
      console.log(files)
      res.send(Object.values(files))
    })
  }
}

app.get('/', (req, res) => {
  res.statusCode = 200
  res.contentType = 'text/html'
  res.write('<h1>Hello</h1>')
  res.end()
})

app.post('/search', (req, res) => {

  fs.readFile('credentials.json', (err, content) => {
    const helper = sendFilesList(res)
    authorize(JSON.parse(content), helper)
  })
})

app.post('/download', (req, res) => {
  req.on('data', data => {
    JSON.parse(data).map(file => {
      const today = (new Date).toISOString().replace(/T.*/, '').replace(/-/g, '.')
      const SAVE_PATH = `/home/rapat/Downloads/${today}`
      const fullPath = path.join(SAVE_PATH, file.path)
      fs.readFile('credentials.json', (err, content) => {
        authorize(JSON.parse(content), auth => {
          downloadAttachment(auth, fullPath, file.messageId, file.partId)
        })
      })
    })
  })
  res.send({})
})

app.post('/mock', (req, res) => {
  fs.readFile('./mock.json', 'utf8', (err, data) => {
    obj = JSON.parse(data)
    res.send(obj)
  })
})


app.listen(port)

