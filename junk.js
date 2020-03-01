
  // req.on('data', data => {
  //   const creds = JSON.parse(data)
  //   emailConnect(creds.username, creds.password)
  //   .then(conn => {
  //     conn.openBox('INBOX')
  //     .then(() => {
  //       const searchCriteria = [
  //         'FLAGGED'
  //       ]
  //       const fetchOptions = {
  //         bodies: [ 'HEADER', '1'],
  //         markSeen: false,
  //         struct: true
  //       }
  //       conn.search(searchCriteria, fetchOptions)
  //       .then(results => {
  //         return Promise.all(results.map(email => {
  //           const parts = imaps.getParts(email.attributes.struct)
  //           const bodyPart = _.find(parts, {subtype: 'html'}) || _.find(parts, {subtype: 'plain'})
  //           const attachments = parts
  //             .filter(part => part.disposition && part.disposition.type.toUpperCase() === 'ATTACHMENT')
  //             .map(part => part.disposition.params.filename)
  //           const params = bodyPart.params
  //           return conn.getPartData(email, bodyPart)
  //           .then(msgBody => {
  //             if (params.charset) {
  //               const buf = new Buffer.from(msgBody)
  //               msgBody = iconv.decode(buf, params.charset)
  //             }
  //             console.log(msgBody)
  //             const headerBody = _.find(email.parts, {'which': 'HEADER'}).body
  //             const sender = headerBody.from[0]
  //             const subject = headerBody.subject[0]
  //             return {[sender]:  {subject: subject, body: msgBody, attachments: attachments}}
  //           })
  //         }))
  //         .then(list => {
  //           return list.reduce((emailsStruct, email) => {
  //             const key = Object.keys(email).pop()
  //             if (emailsStruct[key]) {
  //               emailsStruct[key].push(email[key])
  //             } else {
  //               emailsStruct[key] = [email[key]]
  //             }
  //             return emailsStruct
  //           }, {})
  //         })
  //         .then(orderedEmails => {
  //           res.send(orderedEmails)
  //           fs.writeFile('./mock.json', JSON.stringify(orderedEmails), 'utf8')
  //         }) 
  //       })
  //     })
  //   })
  //   .catch(error => res.send(error))
  // })

// const emailConnect = (user, pass) => {
//   const config = {
//     imap: {
//       user: user,
//       password: pass,
//       host: 'imap.gmail.com',
//       port: 993,
//       tls: true,
//       authTimeout: 3000
//     }
//   }
//   return imaps.connect(config)
// }
