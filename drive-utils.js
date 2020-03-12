const { google } = require('googleapis');
const fs = require('fs')
const fsPromises = require('fs').promises
const path = require('path')

const downloadDriveFile = (auth, filePath, fileId) => {
  const drive = google.drive({version: 'v2', auth})
  const dirname = path.dirname(filePath)
  return fsPromises.mkdir(dirname, { recursive: true })
  .then(() => {
    const dest = fs.createWriteStream(filePath)
    return drive.files.get({
      fileId: fileId,
      alt: 'media'
    }, {responseType: 'stream'})
    .then(res => {
      res.data
      .on('end', () => {
        console.log('Done')
      })
      .on('error', error => {
        console.log('Error', error)
      })
      .pipe(dest)
    })
    .catch(error => {
      console.log(error)
    })
  })
}


module.exports = {
  downloadDriveFile: downloadDriveFile
}

