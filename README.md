# Typescript Node Xbox-Live API
I've written this project because I couldn't find a modern Nodejs library that can access xbox live resources via API calls.

_Requires a valid microsoft account_

### Functionality:<br/>
*Get*:
- Xbox user id by username.
- A player's:
    1. Settings and xuid.
    2. Clips (with pagination).
    3. Screenshots (with pagination).
    4. Achievements per title (with pagination).
    5. Latest activity.

### How to use:
`npm install async-xbox-live-api`<br/>
##### Then:<br/>
*pre-es6:*<br/>
`const xla = require('async-xbox-live-api');`<br/>
*es6:*<br/>
`import * as xla from 'async-xbox-live-api';`

Next you should insert your credentials via the environment variables:<br/>
```
XBL_USERNAME=
XBL_PASSWORD=
```
*NOTE:*<br/>
This library supports .env files, an .env.example file is included
<br/>
<br/>



### Methods:
#### getXuid
```
xla.getXuid('Ninja').then(console.log).catch(console.error);
```

#### getClipsForGamer
```
xla.getClipsForGamer('Ninja').then(console.log).catch(console.error);
```

#### getScreenshotsForGamer
```
xla.getScreenshotsForGamer('Ninja').then(console.log).catch(console.error);
```

#### getAchievementsForGamer
```
xla.getAchievementsForGamer('Ninja').then(console.log).catch(console.error);
```

#### getActivityForGamer
```
xla.getActivityForGamer('Ninja').then(console.log).catch(console.error);
```
<br/>

### Types:
Response types for API requests are included
