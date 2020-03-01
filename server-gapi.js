const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const _ = require('lodash')
const { parse } = require('node-html-parser')
const path = require('path')
const mime = require('mime-types')

Array.prototype.flatMap = function(lambda) { 
  return Array.prototype.concat.apply([], this.map(lambda)); 
};

// If modifying these scopes, delete token.json.
const SCOPES = [
  'https://mail.google.com'
];

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.

// fs.readFile('credentials.json', (err, content) => {
//   if (err) return console.log('Error loading client secret file:', err);
//   // Authorize a client with credentials, then call the Google Drive API.
//   authorize(JSON.parse(content), test);
// });

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client)
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

const parseSender = str => str.replace(/( <).*/, '').replace(/['"]/g, '')

const safeJoin = nodes => path.join(...nodes.map(node => node.replace(/[/\\?%*:|"<>]/g, '-').trim()))


/**
 * Lists the names and IDs of up to 10 files.
 * @param { google.auth.OAuth2 } auth An authorized OAuth2 client.
 */
function getFiles(auth) {
  const gmail = google.gmail({version: 'v1', auth});

  return gmail.users.messages.list({
    userId: 'me',
    labelIds: [
      'STARRED'
    ]
  })
  .then(res => {
    return Promise.all(res.data.messages.map(obj => {
      return gmail.users.messages.get({
        userId: 'me',
        id: obj.id
      })
      .then(res => {
        const sender = _.find(res.data.payload.headers, {name: 'From'}).value
        const subject = _.find(res.data.payload.headers, {name: 'Subject'}).value
        const bodyData = ['text/html', 'text/plain'].map(mimeType => searchBodyRec(res.data.payload, mimeType))[0][0] || ''
        const text = Buffer.from(bodyData.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
        const files = [...findAttachments(res), ...findDriveShares(text)]
        console.log(files)
        return (
          {
            sender: sender, 
            subject: subject, 
            files: files, 
            body: bodyData, 
            id: res.data.id,
            messageId: res.data.id
          }
        )
      })
    }))
    .then(data => {
      return data.reduce((obj, cur, index) => {
        obj[cur.sender] = obj[cur.sender] || {}
        obj[cur.sender].value = cur.id
        obj[cur.sender].label = parseSender(cur.sender)
        const newChild = {
          label: cur.subject, 
          value: cur.subject + index, 
          children: cur.files.map((file, i) => ({
            label: file.filename,
            value: JSON.stringify({
              partId: file.id,
              messageId: cur.id,
              userId: cur.sender,
              path: safeJoin([parseSender(cur.sender), cur.subject, file.filename])
            })
          }))
        }
        if (obj[cur.sender].children) {
          obj[cur.sender].children.push(newChild)
        } else {
          obj[cur.sender].children = [newChild]
        }
        return obj
      }, {})
    })
  })
}

const findDriveShares = html => {
  const root = parse(html)
  return root.querySelectorAll('a').map((elem) => ({ 
    filename: elem.structuredText, url: elem.rawAttributes.href 
  }))
}

const findAttachments = res => res.data.payload.parts.map(part => {
  return part.filename && part.filename.length ? { filename: part.filename, id: part.body.attachmentId } : null
}).filter(filename => filename)

function searchBodyRec(payload, mimeType) {
  if (payload.body && payload.body.size && payload.mimeType === mimeType) {
    return payload.body.data;
  } else if (payload.parts && payload.parts.length) {
    return payload.parts.flatMap(function(part){
      return searchBodyRec(part, mimeType);
    }).filter(function(body) {
      return body;
    });
  }
}

const downloadAttachment = (auth, filePath, messageId, partId) => {
  const gmail = google.gmail({version: 'v1', auth})
  gmail.users.messages.attachments.get({
    'id': partId,
    'messageId': messageId,
    'userId': 'me'
  }, (error, { data }) => {
    const dirname = path.dirname(filePath)
    
    fs.mkdir(dirname, { recursive: true }, error => {
      if (error) console.log(error)
      fs.writeFile(filePath, data.data, 'base64', err => {
        console.log(data)
      })
    })
  })
}

function getAttachments(messageId, callback) {
  const gmail = google.gmail({version: 'v1', auth})
  var parts = message.payload.parts;
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    if (part.filename && part.filename.length > 0) {
      var attachId = part.body.attachmentId;
      var request = gmail.users.messages.attachments.get({
        'id': attachId,
        'messageId': messageId,
        'userId': 'me'
      });
      request.execute(function(attachment) {
        callback(part.filename, part.mimeType, attachment);
      });
    }
  }
}

// const downloadFiles = filesStruct => {
//   const gmail = google.gmail({version: 'v1', auth})
//   Object.entries(filesStruct).map((sender, subjects) => {
//     fs.mkdirSync(`/home/rapat/Downloads/${sender}`)
//     Object.entries(subjects).map((subject, files) => {
//       fs.mkdirSync(`/home/rapat/Downloads/${sender}/${subject}`)
//       gmail.users.messages.attachments.get()

//     })
//   })
// }

module.exports = {
  getFiles: getFiles,
  authorize: authorize,
  downloadAttachment: downloadAttachment
}