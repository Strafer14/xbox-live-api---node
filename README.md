# Asynchronous Node Xbox-Live API
es6 js introduced arrow functions and asynchronous flows. I've written an xbox live api wrapper in node to be able to use this functionality for a cleaner code in your project.

Requires a valid microsoft account.

### Functionality:<br/>
*Get*:
- Xbox user id by username.
- A user's clips (up to 200)
- A user's screenshots (up to 200)

### How to use:
`npm install async-xbox-live-api`<br/>
##### Then:<br/>
*pre-es6:*<br/>
`var xla = require('async-xbox-live-api');`<br/>
*es6:*<br/>
`import xla from 'async-xbox-live-api';`

Next you should insert your credentials for the microsoft account you want to connect to:<br/>
```
xla.username = (xbox live username)
xla.password = (xbox live password)
```
<br/>
<br/>

### Methods:
#### GetXuid
```
xla.getXuid('Ninja').then((resp) => console.log(resp))
```

#### getClipsForGamer
```
xla.getClipsForGamer('Ninja').then((resp) => console.log(resp))
```

#### GetScreenshotsForGamer
```
xla.getScreenshotsForGamer('Ninja').then((resp) => console.log(resp))
```
