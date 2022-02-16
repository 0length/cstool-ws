import * as fs from 'fs-extra'

try {
  job();
} catch (err) {
  console.error('######## static assets copy: ERROR ########', err.message)
}

function job() {
  fs.copy('.env', '.env.bak', (err: any) => {
    if (err) {
      console.log('An error occured while copying env.')
      return console.error(err)
    }
    console.log('Copy env completed!')
  });
  fs.copy('.env.example', '.env', (err: any) => {
    if (err) {
      console.log('An error occured while copying env.')
      return console.error(err)
    }
    console.log('Copy env completed!')
  });
}