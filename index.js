/*
 * (C) Copyright 2017 o2r project.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

const config = require('./config/config');
config.version = require('./package.json').version;
const debug = require('debug')('loader');
const mongoose = require('mongoose');
const backoff = require('backoff');

// check fs & create dirs if necessary
const fse = require('fs-extra');
fse.mkdirsSync(config.fs.base);
fse.mkdirsSync(config.fs.incoming);
fse.mkdirsSync(config.fs.compendium);

// use ES6 promises for mongoose
mongoose.Promise = global.Promise;
const dbURI = config.mongo.location + config.mongo.database;
mongoose.connect(dbURI, {
  useMongoClient: true,
  promiseLibrary: global.Promise // use ES6 promises for underlying MongoDB DRIVE
});
mongoose.connection.on('error', (err) => {
  debug('Could not connect to MongoDB @ %s: %s', dbURI, err);
});

// Express modules and tools
const express = require('express');
const compression = require('compression');
const app = express();
const responseTime = require('response-time');
const bodyParser = require('body-parser');
const randomstring = require('randomstring');

app.use((req, res, next) => {
  debug(req.method + ' ' + req.path);
  next();
});
app.use(responseTime());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies


const url = require('url');

// Passport & session modules for authenticating users.
const User = require('./lib/model/user');
const passport = require('passport');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

const dispatch = require('./controllers/dispatch').dispatch;

const slackbot = require('./lib/slack');

/*
 *  Authentication & Authorization
 *  This is be needed in every service that wants to check if a user is authenticated.
 */

// minimal serialize/deserialize to make authdetails cookie-compatible.
passport.serializeUser((user, cb) => {
  cb(null, user.orcid);
});
passport.deserializeUser((id, cb) => {
  debug("Deserialize for %s", id);
  User.findOne({ orcid: id }, (err, user) => {
    if (err) cb(err);
    cb(null, user);
  });
});

/*
 *  File Upload: check fs & create dirs if necessary
 */
fse.mkdirsSync(config.fs.incoming);
fse.mkdirsSync(config.fs.compendium);

const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    debug('Saving userfile %s to %s', file.originalname, config.fs.incoming);
    cb(null, config.fs.incoming);
  },
  filename: (req, file, cb) => {
    let id = randomstring.generate(config.id_length);
    debug('Generated id "%s" for file %s from fieldname %s', id, file.originalname, file.fieldname);
    cb(null, id);
  }
});
var upload = multer({ storage: storage });

function initApp(callback) {
  debug('Initialize application');

  try {
    // configure express-session, stores reference to authdetails in cookie.
    // authdetails themselves are stored in MongoDBStore
    var mongoStore = new MongoDBStore({
      uri: config.mongo.location + config.mongo.database,
      collection: 'sessions'
    }, err => {
      if (err) {
        debug('Error starting MongoStore: %s', err);
      }
    });

    mongoStore.on('error', err => {
      debug('Error with MongoStore: %s', err);
    });

    app.use(session({
      secret: config.sessionsecret,
      resave: true,
      saveUninitialized: true,
      maxAge: 60 * 60 * 24 * 7, // cookies become invalid after one week
      store: mongoStore
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    /*
     * configure routes
     */
    app.post('/api/v1/compendium', upload.single('compendium'), dispatch);

    app.get('/status', function (req, res) {
      res.setHeader('Content-Type', 'application/json');
      if (!req.isAuthenticated() || req.user.level < config.user.level.view_status) {
        res.status(401).send('{"error":"not authenticated or not allowed"}');
        return;
      }

      var response = {
        service: "loader",
        version: config.version,
        levels: config.user.level,
        mongodb: config.mongo,
        filesystem: config.fs
      };
      res.send(response);
    });

    if (config.slack.enable) {
      slackbot.start((err) => {
        debug('Error starting slackbot (disabling it now): %s', JSON.stringify(err));
        config.slack.enable = false;
      }, (done) => {
        debug('Slack bot enabled and configured - nice! %s', JSON.stringify(done));
      });
    }

    app.listen(config.net.port, () => {
      debug('loader %s with API version %s waiting for requests on port %s',
        config.version,
        config.api_version,
        config.net.port);
    });
  } catch (err) {
    callback(err);
  }

  callback(null);
}

var dbBackoff = backoff.fibonacci({
  randomisationFactor: 0,
  initialDelay: config.mongo.inital_connection_initial_delay,
  maxDelay: config.mongo.inital_connection_max_delay
});

dbBackoff.failAfter(config.mongo.inital_connection_attempts);
dbBackoff.on('backoff', function (number, delay) {
  debug('Trying to connect to MongoDB (#%s) in %sms', number, delay);
});
dbBackoff.on('ready', function (number, delay) {
  debug('Connect to MongoDB (#%s)', number, delay);
  mongoose.connect(dbURI, {
    useMongoClient: true,
    promiseLibrary: global.Promise
  }, (err) => {
    if (err) {
      debug('Error during connect: %s', err);
      mongoose.disconnect(() => {
        debug('Mongoose: Disconnected all connections.');
      });
      dbBackoff.backoff();
    } else {
      // delay app startup to when MongoDB is available
      debug('Initial connection open to %s: %s', dbURI, mongoose.connection.readyState);
      initApp((err) => {
        if (err) {
          debug('Error during init!\n%s', err);
          mongoose.disconnect(() => {
            debug('Mongoose: Disconnected all connections.');
          });
          dbBackoff.backoff();
        }
        debug('Started application.');
      });
    }
  });
});
dbBackoff.on('fail', function () {
  debug('Eventually giving up to connect to MongoDB');
  process.exit(1);
});

dbBackoff.backoff();
