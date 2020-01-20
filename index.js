const express = require('express')
const imaps = require('imap-simple')
const cors = require('cors')
const fs = require('fs')
const simpleParser = require('mailparser').simpleParser
const _ = require('lodash')
const iconv = require('iconv-lite')

const hostname = '127.0.0.1'
const port = 4321
const app = express()

app.use(cors())

const emailConnect = (user, pass) => {
  const config = {
    imap: {
      user: user,
      password: pass,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      authTimeout: 3000
    }
  }
  return imaps.connect(config)
}

const getHtmlBody = email => {
  _.find(imaps.getParts(email), {partID: '1.1.1'})
  return '<h1>adsf</h1>'
}

const bufferToWindows1255 = buff => {
  const iconv = buff.toString('utf8')
}


app.get('/', (req, res) => {
  res.statusCode = 200
  res.contentType = 'text/html'
  res.write('<h1>Hello</h1>')
  res.end()
})

app.post('/search', (req, res) => {
  req.on('data', data => {
    const creds = JSON.parse(data)
    emailConnect(creds.username, creds.password)
    .then(conn => {
      conn.openBox('INBOX')
      .then(() => {
        const searchCriteria = [
          'FLAGGED'
        ]
        const fetchOptions = {
          bodies: [ 'HEADER', '1'],
          markSeen: false,
          struct: true
        }
        conn.search(searchCriteria, fetchOptions)
        .then(results => {
          return Promise.all(results.map(email => {
            const bodyPart = imaps.getParts(email.attributes.struct)[0]
            const params = bodyPart.params
            return conn.getPartData(email, bodyPart)
            .then(msgBody => {
              if (params.charset) {
                const buf = new Buffer.from(msgBody)
                msgBody = iconv.decode(buf, params.charset)
              }
              console.log(msgBody)
              const headerBody = _.find(email.parts, {'which': 'HEADER'}).body
              const sender = headerBody.from[0]
              const subject = headerBody.subject[0]
              return {[sender]:  {subject: subject, body: msgBody}}
            })
          }))
          .then(list => {
            return list.reduce((emailsStruct, email) => {
              const key = Object.keys(email).pop()
              if (emailsStruct[key]) {
                emailsStruct[key].push(email[key])
              } else {
                emailsStruct[key] = [email[key]]
              }
              return emailsStruct
            }, {})
          })
          .then(orderedEmails => {
            res.send(orderedEmails)
            fs.writeFile('./mock.json', JSON.stringify(orderedEmails), 'utf8')
          }) 
        })
      })
    })
    .catch(error => res.send(error))
  })
})

app.post('/mock', (req, res) => {
  fs.readFile('./mock.json', 'utf8', (err, data) => {
    obj = JSON.parse(data)
    res.send(obj)
  })
})


app.listen(port)

