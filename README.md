# Asynchronous Node Xbox-Live API
es6 js introduced arrow functions and asynchronous flows. I've written an xbox live api wrapper in node to be able to use this functionality for a cleaner code in your project.

Requires a valid microsoft account.

###Functionality:
*Get*:
- Xbox user id by username.
- A user's clips (up to 200)
- A user's screenshots (up to 200)

######How to use:
`npm install async-xbox-live-api`
Then:
*pre-es6:*
`var xla = require('xbox-live-api');`
*es6:*
`import xla from 'xbox-live-api';`

Next you should insert your credentials for the microsoft account you want to connect to:
```
xla.username = (xbox live username)
xla.password = (xbox live password)
```

Methods:
######GetXuid
```
xla.getXuid('Ninja').then((resp) => console.log(resp))
```

######getClipsForGamer
```
xla.getClipsForGamer('Ninja').then((resp) => console.log(resp))
```

######GetScreenshotsForGamer
```
xla.getScreenshotsForGamer('Ninja').then((resp) => console.log(resp))
```
