const express = require('express')
const imaps = require('imap-simple')
const cors = require('cors')
const fs = require('fs')
const simpleParser = require('mailparser').simpleParser
const _ = require('lodash')
const iconv = require('iconv-lite')
const { 
  getFiles, 
  authorize, 
  downloadAttachment, 
  getAccessToken,
  authorizePromise
} = require('./server-gapi')
const mime = require('mime-types')
const path = require('path')
const { downloadDriveFile } = require('./drive-utils')
const { google } = require('googleapis');
const fsPromises = require('fs').promises

const hostname = '127.0.0.1'
const port = 4321
const app = express()
const SCOPES = [
  'https://mail.google.com',
  'https://www.googleapis.com/auth/drive'
];
const TOKEN_PATH = 'token.json'
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
  const today = (new Date).toISOString().replace(/T.*/, '').replace(/-/g, '.')
  const SAVE_PATH = `/home/rapat/Downloads/${today}`
  req.on('data', data => {
    var promises = []
    Promise.all(JSON.parse(data).map(file => {
      const fullPath = path.join(SAVE_PATH, file.path)
      return fsPromises.readFile('credentials.json')
      .then(content => {
        // authorize(JSON.parse(content))

        return authorizePromise(JSON.parse(content))
        .then(auth => {
          if (file.partId) {
            return downloadAttachment(auth, fullPath, file.messageId, file.partId)
          } else {
            return downloadDriveFile(auth, fullPath, file.driveId)
          }
        })
      })
    }))
    .then(() => res.send({}))
    .catch(error => res.send({}))
  })
})

app.post('/mock', (req, res) => {
  fs.readFile('./mock.json', 'utf8', (err, data) => {
    obj = JSON.parse(data)
    res.send(obj)
  })
})

app.get('/get-app-state', (req, res) => {
  fs.access(TOKEN_PATH, error => {
    if (error) res.send({message: 'No Token'})
    else res.send({message: 'OK'})
  })
})

app.get('/get-token-url', (req, res) => {
  fs.readFile('credentials.json', (error, content) => {
    const {client_secret, client_id, redirect_uris} = JSON.parse(content).installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    });
    res.send({authUrl: authUrl})
  })
})

app.post('/generate-token', (req, res) => {
  fs.readFile('credentials.json', (error, content) => {
    req.on('data', data => {
      const {client_secret, client_id, redirect_uris} = JSON.parse(content).installed
      const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
      const { code } = JSON.parse(data)
      oAuth2Client.getToken(code, (err, token) => {
        if (err) return console.error('Error retrieving access token', err)
        oAuth2Client.setCredentials(token)
        // Store the token to disk for later program executions
        fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
          if (err) return console.error(err)
          console.log('Token stored to', TOKEN_PATH)
        })
      })
    })
  })
})

app.listen(port)
