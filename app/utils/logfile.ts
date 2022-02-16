import fse from 'fs-extra'
import config from '../../config'

function logfile(...content) {
    if (config.logfile.active === 'true' || config.logfile.active === true)
        return fse.outputFile(__dirname.concat('/../../').concat(config.logfile.path.concat("/")).concat(Date.now().toString()), content.join("\n"), err => {
            if (err) {
                // console.log(`Log error: ${err}.`);
            } else {
                // console.log(`Log success.`);
            }
        });
    return false;
}

export default logfile